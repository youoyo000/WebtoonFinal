from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
import time

def get_all_episodes_count(webtoon_url):
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--window-size=1200x800')
    driver = webdriver.Chrome(options=options)

    driver.get(webtoon_url)
    time.sleep(2)  # 等待頁面初始加載

    total_episodes = 0

    while True:
        # 解析頁面，統計本頁章節數
        soup = BeautifulSoup(driver.page_source, "html.parser")
        episode_items = soup.select("ul#_listUl li")
        total_episodes += len(episode_items)

        # 檢查是否有「下一頁」按鈕且可點
        try:
            next_btn = driver.find_element(By.CSS_SELECTOR, "a.pg_next")
            if "disabled" in next_btn.get_attribute("class"):
                break
            else:
                next_btn.click()
                time.sleep(2)  # 等待新頁面載入
        except Exception:
            # 找不到下一頁按鈕，結束
            break

    driver.quit()
    return total_episodes

if __name__ == "__main__":
    url = "https://www.webtoons.com/zh-hant/fantasy/peaceful-camping-life-in-another-world/list?title_no=6681"
    count = get_all_episodes_count(url)
    print(f"該漫畫總共有 {count} 話")