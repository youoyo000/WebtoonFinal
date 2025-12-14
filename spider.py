import requests
from bs4 import BeautifulSoup
import re
import time

def get_title_no(hyperlink):
    match = re.search(r"title_no=(\d+)", hyperlink)
    return match.group(1) if match else None

def get_episode_count(title_no):
    """用 AJAX API 分頁累計話數"""
    episode_count = 0
    page = 1
    while True:
        url = f"https://www.webtoons.com/zh-hant/ajax/episode/list?titleNo={title_no}&page={page}"
        res = requests.get(url)
        try:
            data = res.json()
        except Exception:
            break
        episode_list = data.get("result", {}).get("list", [])
        if not episode_list:
            break
        episode_count += len(episode_list)
        page += 1
        time.sleep(0.1)
    return episode_count

def crawl_webtoons():
    data_url = "https://www.webtoons.com/zh-hant/originals?webtoonCompleteType=COMPLETED"
    Data = requests.get(data_url)
    Data.encoding = "utf-8"
    soup = BeautifulSoup(Data.text, "html.parser")
    comics = soup.select("ul.daily_card li")
    result = []

    for comic in comics:
        try:
            title = comic.select_one(".subj").text.strip()
            hyperlink = comic.select_one("a")["href"]
            picture = comic.select_one("img")["src"]
            genre = comic.select_one(".genre").text.strip()
            author = comic.select_one(".author").text.strip()

            if not title or not hyperlink or not picture or not genre:
                print(f"❌ 缺少資料，略過漫畫：{title}")
                continue

            title_no = get_title_no(hyperlink)
            episode_count = get_episode_count(title_no) if title_no else 0

            access_note = "⚠️ 需要追漫券" if episode_count < 8 else "✅ 可以免費觀看全部話次"

            doc = {
                "title": title,
                "genre": genre,
                "episodes": f"共 {episode_count} 話",
                "access": access_note,
                "picture": picture,
                "hyperlink": hyperlink,
                "author": author,
                "title_no": title_no
            }
            result.append(doc)
            print(f"✅ 抓取成功：{title}，話數：{episode_count}")
        except Exception as inner_error:
            print(f"⚠️ 處理漫畫 {comic} 時發生錯誤：{inner_error}")

    return result