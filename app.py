# =============================================================
# app.py - Streamlit 웹 앱
# 실시간 날씨를 조회하고 Gemini AI가 옷차림을 추천합니다.
# 실행: streamlit run app.py
# =============================================================

import requests
import streamlit as st

# ── API 키 로드 ────────────────────────────────────────────────
# 로컬: .streamlit/secrets.toml 에서 읽음
# 배포: Streamlit Cloud 환경변수에서 읽음
API_KEY        = st.secrets["API_KEY"]
GEMINI_API_KEY = st.secrets["GEMINI_API_KEY"]
DEFAULT_CITY   = st.secrets.get("DEFAULT_CITY", "Seoul")
LANG           = st.secrets.get("LANG", "kr")
UNITS          = st.secrets.get("UNITS", "metric")

# ── 페이지 기본 설정 ───────────────────────────────────────────
st.set_page_config(
    page_title="날씨 옷차림 추천",
    page_icon="🌤️",
    layout="centered",
)

# ── 커스텀 CSS ─────────────────────────────────────────────────
st.markdown("""
<style>
    .weather-card {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        padding: 24px 28px;
        border-radius: 16px;
        color: white;
        margin-bottom: 20px;
    }
    .weather-card h2 { margin: 0 0 4px 0; font-size: 1.5rem; }
    .weather-card .temp { font-size: 3rem; font-weight: 700; margin: 8px 0; }
    .weather-card .sub  { font-size: 0.95rem; opacity: 0.85; }
    .stat-box {
        background: #f0f4ff;
        border-radius: 12px;
        padding: 14px 18px;
        text-align: center;
    }
    .stat-box .label { font-size: 0.8rem; color: #666; }
    .stat-box .value { font-size: 1.3rem; font-weight: 700; color: #333; }
    .gemini-box {
        background: linear-gradient(135deg, #f8f9fa, #e8f4f8);
        border-left: 4px solid #667eea;
        border-radius: 0 12px 12px 0;
        padding: 20px 24px;
        margin-top: 8px;
        font-size: 1.05rem;
        line-height: 1.8;
        color: #222;
    }
</style>
""", unsafe_allow_html=True)


# ──────────────────────────────────────────────────────────────
# 날씨 데이터 조회 (OpenWeatherMap)
# ──────────────────────────────────────────────────────────────

WEATHER_ICONS = {
    "Clear": "☀️", "Clouds": "☁️", "Rain": "🌧️", "Drizzle": "🌦️",
    "Thunderstorm": "⛈️", "Snow": "❄️", "Mist": "🌫️", "Fog": "🌫️",
    "Haze": "🌫️", "Dust": "💨", "Sand": "💨", "Smoke": "💨",
    "Ash": "🌋", "Squall": "🌬️", "Tornado": "🌪️",
}

WEATHER_KO = {
    "Clear": "맑음", "Clouds": "흐림", "Rain": "비", "Drizzle": "이슬비",
    "Thunderstorm": "천둥번개", "Snow": "눈", "Mist": "안개", "Fog": "짙은 안개",
    "Haze": "연무", "Dust": "황사/먼지", "Sand": "모래바람", "Smoke": "연기",
    "Ash": "화산재", "Squall": "돌풍", "Tornado": "토네이도",
}


@st.cache_data(ttl=600)  # 10분 캐시 (같은 도시 재조회 시 API 절약)
def get_weather(city: str) -> dict | None:
    url = "https://api.openweathermap.org/data/2.5/weather"
    params = {"q": city, "appid": API_KEY, "lang": LANG, "units": UNITS}
    try:
        r = requests.get(url, params=params, timeout=10)
        if r.status_code == 401:
            return {"error": "api_key"}
        if r.status_code == 404:
            return {"error": "city_not_found"}
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        return {"error": "connection"}
    except requests.exceptions.Timeout:
        return {"error": "timeout"}
    except Exception as e:
        return {"error": str(e)}


# ──────────────────────────────────────────────────────────────
# Gemini AI 추천
# ──────────────────────────────────────────────────────────────

def ask_gemini(city_name, country, temp, feels_like,
               temp_min, temp_max, humidity, description, wind_speed) -> str | None:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-3.6-flash:generateContent?key={GEMINI_API_KEY}"
    )
    prompt = f"""
당신은 친근한 날씨 & 패션 어시스턴트입니다.
아래 날씨 데이터를 바탕으로 오늘 어떤 옷을 입으면 좋을지 자연스럽고 친근한 말투로 추천해 주세요.

📍 도시: {city_name}, {country}
🌡️ 현재 기온: {temp:.1f}°C (체감 {feels_like:.1f}°C)
📊 최저/최고: {temp_min:.1f}°C / {temp_max:.1f}°C
💧 습도: {humidity}%
🌬️ 풍속: {wind_speed} m/s
☁️ 날씨 상태: {description}

조건:
- 상의, 하의, 아우터, 신발, 악세서리를 포함해 구체적으로 추천
- 날씨 상태에 따른 주의사항(우산, 마스크 등)도 포함
- 이모지를 적절히 활용해 읽기 편하게 작성
- 4~6문장으로 간결하게
""".strip()

    payload = {"contents": [{"parts": [{"text": prompt}]}]}

    # 실패 시 최대 2번 시도
    for attempt in range(2):
        try:
            r = requests.post(url, json=payload, timeout=30)
            r.raise_for_status()
            return r.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception:
            if attempt == 1:
                return None
            import time
            time.sleep(2)


# ──────────────────────────────────────────────────────────────
# 기본 추천 (Gemini 실패 시 fallback)
# ──────────────────────────────────────────────────────────────

def recommend_outfit_fallback(feels_like: float, condition: str, humidity: int) -> str:
    if feels_like >= 28:
        text = "🔥 **더운 날씨**\n민소매나 얇은 반팔 티셔츠에 반바지 또는 짧은 치마를 추천해요. 샌들이나 슬리퍼를 신고, 선글라스와 자외선차단제는 필수입니다!"
    elif feels_like >= 23:
        text = "😊 **따뜻한 날씨**\n반팔 티셔츠나 얇은 셔츠에 면바지나 청바지가 잘 어울려요. 운동화나 로퍼를 신고, 선글라스도 챙겨보세요."
    elif feels_like >= 17:
        text = "🌤️ **선선한 날씨**\n긴팔 티셔츠나 얇은 니트에 청바지 조합이 딱 좋아요. 얇은 재킷이나 가디건을 걸쳐두면 완벽합니다."
    elif feels_like >= 11:
        text = "🍂 **쌀쌀한 날씨**\n맨투맨이나 두꺼운 니트를 입고, 위에 재킷이나 트렌치코트를 걸쳐요. 얇은 스카프도 고려해 보세요."
    elif feels_like >= 4:
        text = "🧣 **추운 날씨**\n두꺼운 니트나 기모 셔츠에 패딩이나 코트를 입어요. 목도리와 장갑은 꼭 챙기세요!"
    else:
        text = "🥶 **매우 추운 날씨**\n히트텍 레이어링에 두꺼운 롱패딩은 필수예요. 방한 부츠, 목도리, 장갑, 귀마개까지 완전 무장하세요!"

    extras = []
    if condition in ("Rain", "Drizzle", "Thunderstorm"):
        extras.append("☂️ 우산 또는 우비를 꼭 챙기세요!")
    if condition == "Snow":
        extras.append("🧤 방수 장갑과 방한 부츠 착용, 빙판길 주의!")
    if condition in ("Mist", "Fog", "Haze"):
        extras.append("🚗 시야가 좋지 않으니 외출 시 주의하세요.")
    if condition in ("Dust", "Sand", "Smoke"):
        extras.append("😷 마스크 착용을 강력히 권장합니다!")
    if humidity >= 80 and condition not in ("Rain", "Drizzle", "Thunderstorm", "Snow"):
        extras.append("💧 습도가 높으니 통기성 좋은 소재를 선택하세요.")

    if extras:
        text += "\n\n" + "  \n".join(extras)
    return text


# ──────────────────────────────────────────────────────────────
# UI 렌더링
# ──────────────────────────────────────────────────────────────

st.title("🌤️ 날씨 기반 옷차림 추천")
st.caption("OpenWeatherMap + Gemini AI로 오늘 뭐 입을지 알려드려요")

gemini_active = bool(GEMINI_API_KEY)
if gemini_active:
    st.success("✅ Gemini AI 연동 활성화")
else:
    st.info("ℹ️ Gemini 키 미설정 → 기본 추천 모드")

st.divider()

col1, col2 = st.columns([4, 1])
with col1:
    city_input = st.text_input(
        "도시 이름 (영어)",
        value=DEFAULT_CITY,
        placeholder="예: Seoul, Busan, Tokyo, New York",
        label_visibility="collapsed",
    )
with col2:
    search_btn = st.button("🔍 조회", use_container_width=True, type="primary")

if search_btn or city_input:
    city = city_input.strip() if city_input.strip() else DEFAULT_CITY

    with st.spinner(f"'{city}' 날씨 불러오는 중..."):
        data = get_weather(city)

    if data is None or "error" in data:
        err = data.get("error", "") if data else ""
        if err == "api_key":
            st.error("❌ OpenWeatherMap API 키가 유효하지 않습니다.")
        elif err == "city_not_found":
            st.error(f"❌ '{city}' 도시를 찾을 수 없습니다. 영어로 입력해 주세요. (예: Seoul)")
        elif err == "connection":
            st.error("❌ 인터넷 연결을 확인해 주세요.")
        elif err == "timeout":
            st.error("❌ 요청 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.")
        else:
            st.error(f"❌ 오류가 발생했습니다: {err}")
        st.stop()

    city_name   = data["name"]
    country     = data["sys"]["country"]
    temp        = data["main"]["temp"]
    feels_like  = data["main"]["feels_like"]
    temp_min    = data["main"]["temp_min"]
    temp_max    = data["main"]["temp_max"]
    humidity    = data["main"]["humidity"]
    condition   = data["weather"][0]["main"]
    description = data["weather"][0]["description"]
    wind_speed  = data["wind"]["speed"]
    icon        = WEATHER_ICONS.get(condition, "🌡️")
    cond_ko     = WEATHER_KO.get(condition, condition)

    st.markdown(f"""
    <div class="weather-card">
        <h2>📍 {city_name}, {country}</h2>
        <div class="temp">{icon} {temp:.1f}°C</div>
        <div class="sub">
            {cond_ko} ({description}) &nbsp;|&nbsp; 체감 {feels_like:.1f}°C
        </div>
    </div>
    """, unsafe_allow_html=True)

    c1, c2, c3, c4 = st.columns(4)
    with c1:
        st.markdown(f'<div class="stat-box"><div class="label">최저기온</div><div class="value">{temp_min:.1f}°C</div></div>', unsafe_allow_html=True)
    with c2:
        st.markdown(f'<div class="stat-box"><div class="label">최고기온</div><div class="value">{temp_max:.1f}°C</div></div>', unsafe_allow_html=True)
    with c3:
        st.markdown(f'<div class="stat-box"><div class="label">습도</div><div class="value">{humidity}%</div></div>', unsafe_allow_html=True)
    with c4:
        st.markdown(f'<div class="stat-box"><div class="label">풍속</div><div class="value">{wind_speed} m/s</div></div>', unsafe_allow_html=True)

    st.divider()
    st.subheader("👗 오늘의 옷차림 추천")

    if gemini_active:
        with st.spinner("✨ Gemini AI가 추천을 생성하는 중..."):
            gemini_text = ask_gemini(
                city_name, country, temp, feels_like,
                temp_min, temp_max, humidity, description, wind_speed
            )

        if gemini_text:
            st.markdown(f'<div class="gemini-box">{gemini_text}</div>', unsafe_allow_html=True)
            st.caption("✨ Gemini AI 추천")
        else:
            st.warning("Gemini 응답을 가져오지 못했습니다. 기본 추천으로 대체합니다.")
            fallback = recommend_outfit_fallback(feels_like, condition, humidity)
            st.markdown(f'<div class="gemini-box">{fallback}</div>', unsafe_allow_html=True)
    else:
        fallback = recommend_outfit_fallback(feels_like, condition, humidity)
        st.markdown(f'<div class="gemini-box">{fallback}</div>', unsafe_allow_html=True)
