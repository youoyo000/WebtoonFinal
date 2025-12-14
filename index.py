from flask import Flask, request, render_template, jsonify, Response
import requests
from bs4 import BeautifulSoup
import firebase_admin
from firebase_admin import credentials, firestore
import os
import google.generativeai as genai
import re
import time
import random

def get_title_no(hyperlink):
    match = re.search(r"title_no=(\d+)", hyperlink)
    if match:
        return match.group(1)
    match2 = re.search(r'/list\?title_no=(\d+)', hyperlink)
    if match2:
        return match2.group(1)
    match3 = re.search(r'/(\d+)$', hyperlink)
    if match3:
        return match3.group(1)
    return None

def get_episode_count_by_html(html):
    soup = BeautifulSoup(html, "html.parser")
    episode_items = soup.select("ul#_listUl li")
    max_episode = 0
    for ep in episode_items:
        tx_span = ep.select_one("span.tx")
        if tx_span and tx_span.text.startswith("#"):
            try:
                ep_no = int(tx_span.text.lstrip("#"))
                if ep_no > max_episode:
                    max_episode = ep_no
            except Exception:
                continue
    return max_episode

cred = credentials.Certificate("firebase_key.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
app = Flask(__name__)
api_key = os.getenv("API_KEY")
genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.0-flash")

category_display_cache = {}

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/spider")
def spider_completed():
    try:
        total = 0
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        }
        first_url = "https://www.webtoons.com/zh-hant/originals/complete?sortOrder=UPDATE&page=1"
        res = requests.get(first_url, headers=headers)
        res.encoding = "utf-8"
        soup = BeautifulSoup(res.text, "html.parser")
        max_page = 1
        for a in soup.select('div.paginate > a'):
            try:
                p = int(a.text.strip())
                if p > max_page:
                    max_page = p
            except Exception:
                continue
        print(f"總頁數: {max_page}")
        for page in range(1, max_page + 1):
            url = f"https://www.webtoons.com/zh-hant/originals/complete?sortOrder=UPDATE&page={page}"
            print(f"抓取第{page}頁: {url}")
            res = requests.get(url, headers=headers)
            res.encoding = "utf-8"
            soup = BeautifulSoup(res.text, "html.parser")
            comics = soup.select('a.link._originals_title_a')
            print(f"本頁共 {len(comics)} 本漫畫")
            for comic_a in comics:
                try:
                    hyperlink = comic_a['href']
                    genre = comic_a.select_one('.genre').text.strip() if comic_a.select_one('.genre') else ''
                    title = comic_a.select_one('.title').text.strip() if comic_a.select_one('.title') else ''
                    print(f"蒐集: {title} ({hyperlink})")
                    # 詳細頁
                    res2 = requests.get(hyperlink, headers=headers)
                    res2.encoding = "utf-8"
                    soup2 = BeautifulSoup(res2.text, "html.parser")
                    cover_img_tag = (
                        soup2.select_one(".detail_header .thmb img")
                        or soup2.select_one(".thmb img")
                        or soup2.select_one("img")
                    )
                    picture = cover_img_tag["src"] if cover_img_tag and cover_img_tag.has_attr("src") else ""
                    if picture.startswith("//"):
                        picture = "https:" + picture
                    elif picture.startswith("/"):
                        picture = "https://www.webtoons.com" + picture
                    author = ""
                    author_tag = soup2.select_one(".author")
                    if author_tag:
                        if author_tag.find_all("a"):
                            author = " ".join(a.get_text(strip=True) for a in author_tag.find_all("a"))
                        else:
                            author = author_tag.get_text(strip=True)
                    episode_count = get_episode_count_by_html(res2.text)
                    access_note = ""
                    completed_tag = soup2.select_one("span.txt_ico_completed")
                    if completed_tag and completed_tag.parent and "完結" in completed_tag.parent.get_text():
                        if soup2.find(string=lambda t: t and "在APP可以閱讀更多話次" in t):
                            access_note = "已完結，需要追漫券"
                        else:
                            access_note = "已完結，可免費看完整話數!"
                    # 評分
                    score = ""
                    score_tag = soup2.select_one('em.cnt#_starScoreAverage')
                    if score_tag:
                        score = score_tag.text.strip()
                    # 訂閱
                    subscribe = ""
                    for li in soup2.select('ul.grade_area li'):
                        icon = li.select_one('span.ico_subscribe')
                        if icon:
                            cnt = li.select_one('em.cnt')
                            if cnt:
                                subscribe = cnt.text.strip()
                                break
                    # 簡介
                    summary = ""
                    summary_tag = soup2.select_one('p.summary')
                    if summary_tag:
                        summary = summary_tag.text.strip()
                    doc = {
                        "title": title,
                        "genre": genre,
                        "author": author,
                        "episodes": f"共 {episode_count} 話",
                        "access": access_note,
                        "picture": picture,
                        "hyperlink": hyperlink,
                        "score": score,
                        "subscribe": subscribe,
                        "summary": summary
                    }
                    title_no = get_title_no(hyperlink)
                    comic_id = title_no if title_no else hyperlink.split("/")[-1]
                    print(f"即將寫入: {comic_id} {title}")
                    db.collection("漫畫含分類").document(comic_id).set(doc)
                    print(f"✅ 寫入成功：{comic_id} {title}")
                    total += 1
                except Exception as inner_error:
                    print(f"⚠️ 處理漫畫時發生錯誤：{inner_error}, title={title}, hyperlink={hyperlink}")
                time.sleep(0.5)
        return f"✅ 完成，共寫入 {total} 本完結漫畫。"
    except Exception as e:
        return f"❌ 爬蟲錯誤：{e}"

@app.route("/DispComic")
def DispComic():
    keyword = request.args.get("keyword", "")
    info = ""
    found = False
    docs = db.collection("漫畫含分類").get()
    for doc in docs:
        comic = doc.to_dict()
        if keyword in comic.get("title", ""):
            found = True
            match = re.search(r"共 (\d+) 話", comic.get("episodes", ""))
            episode_count = int(match.group(1)) if match else 0
            access = comic.get("access", "")
            info += (
                f"標題：{comic.get('title','')}\n"
                f"分類：{comic.get('genre','')}\n"
                f"作者：{comic.get('author','')}\n"
                f"話次：{comic.get('episodes','')}\n"
                f"狀態：{access}\n"
                f"評分：{comic.get('score','')}\n"
                f"簡介：{comic.get('summary','')}\n"
                f"連結：{comic.get('hyperlink','')}\n"
                f"圖片：{comic.get('picture','')}\n\n"
            )
    if not found:
        info += "很抱歉，目前無符合這個關鍵字的相關漫畫喔"
    return info

@app.route("/proxy_image")
def proxy_image():
    url = request.args.get("url")
    if not url:
        return "No url", 400
    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(url, headers=headers, timeout=5)
        if resp.status_code == 200:
            return Response(resp.content, mimetype=resp.headers.get('Content-Type', 'image/png'))
        else:
            return "Image not found", 404
    except Exception as e:
        return f"Proxy error: {e}", 500

@app.route("/webhook", methods=["POST"])
def webhook():
    global category_display_cache
    req = request.get_json(force=True)
    action = req["queryResult"]["action"]
    session_id = req.get("session", "")

    if action == "genreChoice":
        genre = req["queryResult"]["parameters"].get("genre")
        docs = db.collection("漫畫含分類").get()
        genre_comics = [doc.to_dict() for doc in docs if genre in doc.to_dict().get("genre", "")]
        # 免費漫畫優先
        free = [comic for comic in genre_comics if comic.get("access", "") == "已完結，可免費看完整話數!"]
        not_free = [comic for comic in genre_comics if comic.get("access", "") != "已完結，可免費看完整話數!"]
        sorted_comics = free + not_free
        n = len(sorted_comics)
        result = f"您選擇的漫畫分類是：{genre}，共{n}本漫畫，免費優先如下：\n"
        for comic in sorted_comics:
            result += (
                f"標題：{comic['title']}\n"
                f"連結：{comic['hyperlink']}\n"
                f"狀態：{comic.get('access','')}\n"
                "------------------------\n"
            )
        return jsonify({
            "fulfillmentMessages": [
                {
                    "payload": {
                        "line": {
                            "type": "text",
                            "text": result.strip()
                        }
                    }
                },
                {
                    "payload": {
                        "line": {
                            "type": "text",
                            "text":"\n如要搜尋作品的詳細資訊，請輸入：作品是..."
                        }
                    }
                }
            ]
        })

    elif action == "genreAll":
        genre = req["queryResult"]["parameters"].get("genre")
        docs = db.collection("漫畫含分類").get()
        genre_comics = [doc.to_dict() for doc in docs if genre in doc.to_dict().get("genre", "")]
        n = len(genre_comics)
        if n > 0:
            return jsonify({
                "fulfillmentMessages": [
                    {
                        "payload": {
                            "line": {
                                "type": "text",
                                "text": f"資料筆數過多，正在處理請耐心等候...\n分類「{genre}」共有{n}本漫畫，即將為您整理全部清單。"
                            }
                        }
                    }
                ]
            })
        else:
            return jsonify({"fulfillmentText": f"目前無分類「{genre}」的漫畫。"})

    elif action == "ComicDetail":
        detail = req["queryResult"]["parameters"].get("comicq")
        keyword = req["queryResult"]["parameters"].get("any")
        docs = db.collection("漫畫含分類").get()
        for doc in docs:
            comic = doc.to_dict()
            if detail == "名稱" and keyword in comic.get("title", ""):
                image_url = request.url_root.rstrip("/") + "/static/webtoon.png"
                score = comic.get("score", "無")
                summary = comic.get("summary", "無")
                # 1. 組主 Flex 訊息（含評分）
                flex_contents = {
                    "type": "bubble",
                    "hero": {
                        "type": "image",
                        "url": image_url,
                        "size": "full",
                        "aspectRatio": "20:13",
                        "aspectMode": "cover"
                    },
                    "body": {
                        "type": "box",
                        "layout": "vertical",
                        "contents": [
                            {"type": "text", "text": comic.get('title',''), "weight": "bold", "size": "xl"},
                            {"type": "text", "text": f"分類：{comic.get('genre','')}", "size": "sm"},
                            {"type": "text", "text": f"作者：{comic.get('author','')}", "size": "sm"},
                            {"type": "text", "text": f"話數：{comic.get('episodes','')}", "size": "sm"},
                            {"type": "text", "text": f"評分：{score}", "size": "sm"},
                            {"type": "text", "text": f"狀態：{comic.get('access','')}", "size": "sm"},
                        ]
                    },
                    "footer": {
                        "type": "box",
                        "layout": "vertical",
                        "spacing": "sm",
                        "contents": [
                            {
                                "type": "button",
                                "action": {
                                    "type": "uri",
                                    "label": "前往閱讀",
                                    "uri": comic.get('hyperlink','')
                                },
                                "style": "primary"
                            }
                        ]
                    }
                }
                messages = [
                    {
                        "payload": {
                            "line": {
                                "type": "flex",
                                "altText": f"{comic.get('title','')} 漫畫資訊",
                                "contents": flex_contents
                            }
                        }
                    }
                ]
                # 2. 若簡介太長（>250字）分到第二則
                if summary and len(summary) > 250:
                    messages.append({
                        "payload": {
                            "line": {
                                "type": "text",
                                "text": f"簡介：{summary}"
                            }
                        }
                    })
                else:
                    # 若不長則直接加在 flex card 之後
                    messages.append({
                        "payload": {
                            "line": {
                                "type": "text",
                                "text": f"簡介：{summary}" if summary else "（無簡介）"
                            }
                        }
                    })
                # 結尾提示
                messages.append({
                        "payload": {
                            "line": {
                                "type": "text",
                                "text": "有更多想查詢的漫畫嗎？請再次輸入作品是...，或是輸入「漫畫」再換其他分類！"
                            }
                        }
                })
                return jsonify({"fulfillmentMessages": messages})
        return jsonify({"fulfillmentText": "很抱歉，目前無符合這個關鍵字的相關漫畫喔"})

    elif action == "FreeComics":
        docs = db.collection("漫畫含分類").get()
        free_comics = [doc.to_dict() for doc in docs if doc.to_dict().get("access", "") == "已完結，可免費看完整話數!"]
        n = len(free_comics)
        result = f"隨機顯示 25 本免費完整觀看漫畫（共{n}本）：\n"
        if n > 25:
            sampled = random.sample(free_comics, 25)
        else:
            sampled = free_comics
        for comic in sampled:
            result += (
                f"標題：{comic.get('title','')}\n"
                f"分類：{comic['genre']}\n"
                f"話次：{comic['episodes']}\n"
                f"連結：{comic.get('hyperlink','')}\n"
                "------------------------\n"
            )
        if not sampled:
            result += "目前無可免費完整觀看的漫畫。"
        return jsonify({
            "fulfillmentMessages": [
                {
                    "payload": {
                        "line": {
                            "type": "text",
                            "text": result.strip() + "\n如果要搜尋作品的詳細資訊，請輸入：作品是..."
                        }
                    }
                }
            ]
        })

    elif action == "input.unknown":
        info = req["queryResult"]["queryText"]
        try:
            response = model.generate_content(info)
            ai_reply = response.text if hasattr(response, 'text') else str(response)
        except Exception as e:
            ai_reply = f"AI 回覆失敗：{e}"
        return jsonify({"fulfillmentText": ai_reply})

    else:
        return jsonify({"fulfillmentText": "未定義的操作。"})

@app.route("/AI")
def AI():
    try:
        response = model.generate_content('我想查詢靜宜大學資管系的評價？')
        return response.text if hasattr(response, 'text') else str(response)
    except Exception as e:
        return f"AI 失敗：{e}"

if __name__ == "__main__":
    app.run(debug=True)