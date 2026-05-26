import requests
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

# ── Config ──────────────────────────────────────────────
API_BASE = "http://localhost:8000"
COURSE_CODE = "PHY101"       # PHY-CM 101 = PHY101 in our DB
SESSION = "2025/2026"
# ────────────────────────────────────────────────────────

driver = webdriver.Chrome()
url = "https://script.google.com/macros/s/AKfycbxdnCdgnAOpcKSiLDWeW1y3xGbYXgT1nsQ4aFOL1aAaMDO8pCxrK6qoCOJvo3LZZ_ILKw/exec"
driver.get(url)

wait = WebDriverWait(driver, 20)

# Switch into nested iframes once
outer_iframe = wait.until(EC.presence_of_element_located((By.ID, "sandboxFrame")))
driver.switch_to.frame(outer_iframe)
inner_iframe = wait.until(EC.presence_of_element_located((By.TAG_NAME, "iframe")))
driver.switch_to.frame(inner_iframe)

scraped_results = []

for number in range(1001, 1108):
    matric_no = f"25190{number}"
    password = str(number)

    print(f"Checking {matric_no}...", end=" ")

    try:
        matric_input = wait.until(EC.presence_of_element_located((By.ID, "matricNo")))
        matric_input.clear()
        matric_input.send_keys(matric_no)

        password_input = driver.find_element(By.ID, "password")
        password_input.clear()
        password_input.send_keys(password)

        driver.find_element(By.ID, "btn").click()
        time.sleep(5)

        output = driver.find_element(By.ID, "output")
        html = output.get_attribute("innerHTML").lower()

        if "error" in html or "not found" in html or "result-item" not in html:
            print("NOT FOUND")
            continue

        items = driver.find_elements(By.CLASS_NAME, "result-item")
        data = {}
        for item in items:
            label = item.find_element(By.CLASS_NAME, "label").text.strip()
            value = item.find_element(By.CLASS_NAME, "value").text.strip()
            data[label] = value

        record = {
            "matric_no": matric_no,
            "name": data.get("Name", ""),
            "ca_score": float(data.get("C/A Score (/30)", 0) or 0),
            "exam_score": float(data.get("Exam Score (/70)", 0) or 0),
            "total_score": float(data.get("Total (/100)", 0) or 0),
        }
        scraped_results.append(record)
        print(f"✅ {record['name']} | Total: {record['total_score']}")

    except Exception as e:
        print(f"ERROR: {e}")
        continue

driver.quit()

# ── Send all results to FastAPI ──────────────────────────
print(f"\nSending {len(scraped_results)} records to API...")

response = requests.post(
    f"{API_BASE}/ingest/scrape",
    params={"course_code": COURSE_CODE, "session": SESSION},
    json=scraped_results
)

print(response.json())
print("✅ Done!")