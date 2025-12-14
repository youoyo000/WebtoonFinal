from flask import Flask, render_template, Response, stream_with_context, jsonify, request
import requests
from bs4 import BeautifulSoup
import re
import time
import json
import os
from flask_cors import CORS 

# 初始化 Flask
app = Flask(__name__)
CORS(app)

# ==========================================
# 🔴 核心修正：使用絕對路徑，確保一定找得到檔案
# ==========================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, 'comics_data.json')

# 啟動時印出路徑，方便除錯
print("="*50)
print(f"📂 系統啟動中...")
print(f"📂 資料庫路徑已鎖定為: {DATA_FILE}")
print("="*50)

# --- 工具函式 ---

def get_title_no(hyperlink):
    """從網址解析唯一的 title_no"""
    match = re.search(r"title_no=(\d+)", hyperlink)
    if match: return match.group(1)
    match2 = re.search(r'/list\?title_no=(\d+)', hyperlink)
    return match2.group(1) if match2 else None

def get_episode_count_by_html(html_content):
    """解析 HTML 獲取最新話次號碼 (數字)"""
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
    """讀取本地 JSON 並轉為 {id: data} 的字典格式以便快速比對"""
    if not os.path.exists(DATA_FILE):
        return {}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content: return {} # 防止空檔案報錯
            data_list = json.loads(content)
            # 將 List 轉為 Dictionary，Key 是 comic_id
            return {item['id']: item for item in data_list}
    except Exception as e:
        print(f"讀取 JSON 失敗: {e}")
        return {}

def save_local_data(data_dict):
    """將字典轉回 List 並存入 JSON"""
    try:
        data_list = list(data_dict.values())
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data_list, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"存檔失敗: {e}")

# --- 路由設定 ---

@app.route('/')
def home():
    return "Webtoon Crawler API is Running!"

@app.route('/api/proxy-image')
def proxy_image():
    url = request.args.get('url')
    if not url: return "No URL", 400
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Referer": "https://www.webtoons.com/"
        }
        resp = requests.get(url, headers=headers, timeout=15)
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        headers = [(name, value) for (name, value) in resp.raw.headers.items() if name.lower() not in excluded_headers]
        return Response(resp.content, resp.status_code, headers)
    except Exception as e:
        return str(e), 500

@app.route('/api/comics')
def get_comics_api():
    # 加入路徑檢查，讓你在終端機看到它有沒有找到
    if not os.path.exists(DATA_FILE):
        print(f"❌ API 請求失敗：找不到檔案於 {DATA_FILE}")
        return jsonify([])
    
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content: return jsonify([])
            return jsonify(json.loads(content))
    except Exception as e:
        print(f"❌ 讀取錯誤: {e}")
        return jsonify([])

@app.route('/start-crawl')
def start_crawl():
    def generate():
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Referer": "https://www.webtoons.com/"
        }
        
        yield "data: 🚀 爬蟲啟動：比對本地 JSON 模式\n\n"
        
        # 1. 載入本地資料庫
        local_db = load_local_data()
        yield f"data: 📂 目前本地資料庫共有 {len(local_db)} 部漫畫\n\n"

        # 2. 取得總頁數 (以完結區為例)
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
            yield f"data: 📦 線上清單共 {max_page} 頁，開始掃描...\n\n"
        except Exception as e:
            yield f"data: ❌ 無法連接 Webtoon: {str(e)}\n\n"
            return

        total_updated = 0
        total_new = 0
        total_skipped = 0
        
        # 3. 開始分頁爬取
        for page in range(1, max_page + 1): 
            url = f"https://www.webtoons.com/zh-hant/originals/complete?sortOrder=UPDATE&page={page}"
            yield f"data: 📄 正在掃描第 {page} / {max_page} 頁...\n\n"
            
            try:
                res = requests.get(url, headers=headers)
                soup = BeautifulSoup(res.text, "html.parser")
                comics = soup.select('a.link._originals_title_a')
            except Exception as e:
                yield f"data: ❌ 讀取頁面失敗: {str(e)}\n\n"
                continue
            
            page_dirty = False 

            for comic_a in comics:
                try:
                    # --- 取得列表頁資訊 ---
                    title = comic_a.select_one('.title').text.strip()
                    hyperlink = comic_a['href']
                    genre = comic_a.select_one('.genre').text.strip()
                    title_no = get_title_no(hyperlink)
                    
                    if not title_no: continue
                    comic_id = title_no

                    # --- 關鍵：檢查是否需要更新 ---
                    # 必須先抓取內頁才能知道話次有沒有變多，這是必要的 Request
                    res_detail = requests.get(hyperlink, headers=headers)
                    res_detail.encoding = "utf-8"
                    
                    # 取得目前線上最新話次 (整數)
                    current_episode_count = get_episode_count_by_html(res_detail.text)
                    current_episodes_str = f"共 {current_episode_count} 話"

                    # 比對邏輯
                    old_data = local_db.get(comic_id)
                    is_new = False
                    is_update = False

                    if old_data is None:
                        is_new = True
                        yield f"data: ✅ 發現新漫畫：{title}\n\n"
                    else:
                        # 比對話次數量 (使用 .get 避免舊資料沒有該欄位報錯)
                        old_count = old_data.get('episode_count', 0)
                        
                        if current_episode_count > old_count:
                            is_update = True
                            yield f"data: 🔄 發現更新：{title} ({old_count} -> {current_episode_count})\n\n"
                        else:
                            # 資料完全一樣，直接略過
                            # yield f"data: ⏭️ 略過：{title} (無變更)\n\n" 
                            total_skipped += 1
                            time.sleep(0.05) # 稍微休息極短時間
                            continue 

                    # --- 如果是新資料或更新，才執行解析與儲存 ---
                    soup2 = BeautifulSoup(res_detail.text, "html.parser")
                    
                    cover_tag = soup2.select_one(".detail_header .thmb img") or soup2.select_one("img")
                    picture = cover_tag["src"] if cover_tag else ""
                    
                    author_tag = soup2.select_one(".author")
                    author = author_tag.get_text(strip=True) if author_tag else "未知"
                    
                    access_note = "已完結，可免費看完整話數!"
                    if soup2.find(string=lambda t: t and "在APP可以閱讀更多話次" in t):
                        access_note = "已完結，需要追漫券"

                    current_time = time.strftime("%Y-%m-%d %H:%M:%S")

                    # 建立資料物件
                    doc = {
                        "id": comic_id,
                        "title": title,
                        "genre": genre,
                        "author": author,
                        "episodes": current_episodes_str,
                        "episode_count": current_episode_count, # 存入數字方便下次比對
                        "access": access_note,
                        "picture": picture,
                        "hyperlink": hyperlink,
                        "last_updated": current_time,
                        "crawl_date": current_time
                    }

                    # 如果是更新，保留原本的 crawl_date (初次爬取時間)
                    if is_update and old_data:
                        doc['crawl_date'] = old_data.get('crawl_date', current_time)

                    # 寫入記憶體中的字典
                    local_db[comic_id] = doc
                    page_dirty = True 

                    if is_new: total_new += 1
                    if is_update: total_updated += 1
                    
                    time.sleep(0.1) # 有爬取動作時，休息久一點避免被擋

                except Exception as inner_e:
                    yield f"data: ❌ 處理 {title} 時發生錯誤: {str(inner_e)}\n\n"
            
            # 該頁面全部跑完後，如果有變動才寫入硬碟
            if page_dirty:
                save_local_data(local_db)
                yield f"data: 💾 第 {page} 頁資料已更新並存檔\n\n"
            
            yield f"data: 🏁 第 {page} 頁完成\n\n"

        yield f"data: 🎉 任務結束！新增: {total_new}，更新: {total_updated}，略過: {total_skipped}。\n\n"
        yield "data: DONE\n\n"

    return Response(stream_with_context(generate()), mimetype='text/event-stream')

if __name__ == "__main__":
    # 🔴 確保 Port 是 5000，才能對應到 React 的設定
    app.run(debug=True, port=5000)