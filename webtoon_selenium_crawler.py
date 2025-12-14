from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service # 新增
from webdriver_manager.chrome import ChromeDriverManager # 新增
from bs4 import BeautifulSoup
import time
import os # 新增

def get_all_episodes_count(webtoon_url):
    print("🚗 啟動爬蟲，正在設定 Chrome...")
    
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage') # 在容器環境這行很重要
    options.add_argument('--window-size=1200x800')

    # ==========================================
    # 🔴 Render 專用設定 (關鍵修改)
    # ==========================================
    # 這是我們在 render-build.sh 裡面安裝 Chrome 的位置
    render_chrome_path = "/opt/render/project/.render/chrome/opt/google/chrome/google-chrome"
    
    # 判斷檔案是否存在 (如果存在代表在 Render 上，不存在代表在你的電腦上)
    if os.path.exists(render_chrome_path):
        print(f"✅ 偵測到 Render 環境，使用自訂路徑: {render_chrome_path}")
        options.binary_location = render_chrome_path
    else:
        print("💻 偵測到本地環境，使用系統預設 Chrome")

    # 使用 webdriver-manager 自動安裝並啟動對應的 Driver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    # ==========================================

    try:
        driver.get(webtoon_url)
        time.sleep(2)  # 等待頁面初始加載

        total_episodes = 0

        while True:
            # 解析頁面，統計本頁章節數
            soup = BeautifulSoup(driver.page_source, "html.parser")
            episode_items = soup.select("ul#_listUl li")
            total_episodes += len(episode_items)
            print(f"目前累計話數: {total_episodes}") # 加個 print 方便看進度

            # 檢查是否有「下一頁」按鈕且可點
            try:
                next_btn = driver.find_element(By.CSS_SELECTOR, "a.pg_next")
                # 注意：有些網站是用 class 判斷，有些是用屬性，這裡保持你原本的寫法
                if "disabled" in next_btn.get_attribute("class"):
                    break
                else:
                    next_btn.click()
                    time.sleep(2)  # 等待新頁面載入
            except Exception:
                # 找不到下一頁按鈕，結束
                break
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")
    finally:
        # 確保無論如何都會關閉瀏覽器，避免記憶體洩漏
        driver.quit()

    return total_episodes

if __name__ == "__main__":
    url = "https://www.webtoons.com/zh-hant/fantasy/peaceful-camping-life-in-another-world/list?title_no=6681"
    count = get_all_episodes_count(url)
    print(f"該漫畫總共有 {count} 話")