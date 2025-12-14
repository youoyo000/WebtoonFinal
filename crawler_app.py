from flask import Flask, render_template, Response, stream_with_context, jsonify
import requests
from bs4 import BeautifulSoup
import re
import time
import json
import os

# 初始化 Flask
app = Flask(__name__)

# --- 設定 JSON 資料庫路徑 ---
DATA_FILE = 'comics_data.json'

# --- 工具函式 ---

def get_title_no(hyperlink):
    """從網址提取唯一 ID (title_no)"""
    match = re.search(r"title_no=(\d+)", hyperlink)
    if match: return match.group(1)
    match2 = re.search(r'/list\?title_no=(\d+)', hyperlink)
    return match2.group(1) if match2 else None

def get_episode_count_by_html(html_content):
    """直接從詳細頁 HTML 解析 data-episode-no"""
    try:
        soup = BeautifulSoup(html_content, "html.parser")
        episode_list = soup.find("ul", id="_listUl")
        if not episode_list: return 0
        latest_item = episode_list.find("li", class_="_episodeItem")
        if latest_item and "data-episode-no" in latest_item.attrs:
            return int(latest_item["data-episode-no"])
        return 0
    except Exception:
        return 0

def load_local_data():
    """讀取本地 JSON 檔案，轉成 Dictionary 以便快速比對"""
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            data_list = json.load(f)
            # 轉成 Dict 格式: { "comic_id": {資料...}, ... }
            return {item['id']: item for item in data_list}
    except Exception as e:
        print(f"讀取 JSON 失敗: {e}")
        return {}

def save_local_data(data_dict):
    """將 Dictionary 轉回 List 並存入 JSON"""
    try:
        data_list = list(data_dict.values())
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"存檔失敗: {e}")

# --- 路由設定 ---

@app.route('/')
def home():
    return render_template('dashboard.html') # 請確保你有 dashboard.html

# 新增這個 API 讓前端 Dashboard 抓資料
@app.route('/api/comics')
def get_comics_api():
    if not os.path.exists(DATA_FILE):
        return jsonify([])
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return jsonify(json.load(f))

@app.route('/start-crawl')
def start_crawl():
    """執行爬蟲並即時回傳進度 (JSON 版)"""
    def generate():
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Referer": "https://www.webtoons.com/"
        }
        
        yield "data: 🚀 爬蟲系統啟動 (本地 JSON 模式)...\n\n"
        
        # 1. 先把舊資料全部讀進來 (記憶體快取)
        local_db = load_local_data()
        yield f"data: 📂 已載入本地資料庫，共 {len(local_db)} 筆資料\n\n"

        # 2. 取得總頁數 (這段保持不變)
        first_url = "https://www.webtoons.com/zh-hant/originals/complete?sortOrder=UPDATE&page=1"
        try:
            res = requests.get(first_url, headers=headers)
            soup = BeautifulSoup(res.text, "html.parser")
            max_page = 1
            for a in soup.select('div.paginate > a'):
                try:
                    p = int(a.text.strip())
                    if p > max_page: max_page = p
                except: continue
            yield f"data: 📦 偵測到完結漫畫共 {max_page} 頁\n\n"
        except Exception as e:
            yield f"data: ❌ 初始連線失敗: {str(e)}\n\n"
            return

        total_processed = 0
        total_updated = 0
        total_skipped = 0
        
        # 正式環境請用 range(1, max_page + 1)
        for page in range(1, 3): 
            url = f"https://www.webtoons.com/zh-hant/originals/complete?sortOrder=UPDATE&page={page}"
            yield f"data: 📄 正在讀取第 {page} 頁清單...\n\n"
            
            try:
                res = requests.get(url, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")
                comics = soup.select('a.link._originals_title_a')
            except Exception as e:
                yield f"data: ❌ 讀取頁面失敗: {str(e)}\n\n"
                continue
            
            # 用於標記是否需要存檔 (每一頁存一次，避免太頻繁寫硬碟)
            page_dirty = False 

            for comic_a in comics:
                try:
                    title = comic_a.select_one('.title').text.strip()
                    hyperlink = comic_a['href']
                    genre = comic_a.select_one('.genre').text.strip()
                    title_no = get_title_no(hyperlink)
                    comic_id = title_no if title_no else str(int(time.time()))

                    yield f"data: 🔍 分析中：{title}...\n\n"

                    # 請求詳細頁
                    res_detail = requests.get(hyperlink, headers=headers)
                    res_detail.encoding = "utf-8"
                    
                    episode_count = get_episode_count_by_html(res_detail.text)
                    current_episodes_str = f"共 {episode_count} 話"

                    # === 【關鍵修改】直接從記憶體 (local_db) 比對，不連線資料庫 ===
                    old_data = local_db.get(comic_id)
                    
                    if old_data and old_data.get('episodes') == current_episodes_str:
                        yield f"data: ⏭️ 話數無變更 ({episode_count})，跳過更新\n\n"
                        total_skipped += 1
                        time.sleep(0.05) 
                        continue 
                    
                    # --- 需要更新 ---
                    soup2 = BeautifulSoup(res_detail.text, "html.parser")
                    cover_tag = soup2.select_one(".detail_header .thmb img") or soup2.select_one("img")
                    picture = cover_tag["src"] if cover_tag else ""
                    
                    author_tag = soup2.select_one(".author")
                    author = author_tag.get_text(strip=True) if author_tag else "未知"
                    
                    access_note = "已完結，可免費看完整話數!"
                    if soup2.find(string=lambda t: t and "在APP可以閱讀更多話次" in t):
                        access_note = "已完結，需要追漫券"

                    current_time = time.strftime("%Y-%m-%d %H:%M:%S")

                    # 建立新資料物件
                    doc = {
                        "id": comic_id, # JSON 需要把 ID 寫在裡面
                        "title": title,
                        "genre": genre,
                        "author": author,
                        "episodes": current_episodes_str,
                        "episode_count": episode_count, # 存數字方便未來排序
                        "access": access_note,
                        "picture": picture,
                        "hyperlink": hyperlink,
                        "crawl_date": current_time,
                        "last_updated": current_time
                    }

                    # 更新記憶體中的資料
                    local_db[comic_id] = doc
                    page_dirty = True # 標記資料已變動

                    if old_data:
                        yield f"data: 🔄 更新資料：{title}\n\n"
                    else:
                        yield f"data: ✅ 新增資料：{title}\n\n"
                        
                    total_updated += 1
                    total_processed += 1
                    time.sleep(0.1)

                except Exception as inner_e:
                    yield f"data: ❌ 錯誤: {str(inner_e)}\n\n"
            
            # --- 每一頁處理完後，如果有更新，就存檔一次 ---
            if page_dirty:
                save_local_data(local_db)
                yield f"data: 💾 第 {page} 頁資料已存檔\n\n"
            
            yield f"data: 🏁 第 {page} 頁完成\n\n"

        yield f"data: 🎉 任務結束！更新: {total_updated}，略過: {total_skipped}。\n\n"
        yield "data: DONE\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

if __name__ == "__main__":
    app.run(debug=True, port=5001)