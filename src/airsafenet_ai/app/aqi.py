def pm25_to_aqi(pm25: float) -> int:
    if pm25 <= 12:
        return int(pm25 * 50 / 12)
    elif pm25 <= 35.4:
        return int((pm25 - 12) * 50 / (35.4 - 12) + 50)
    elif pm25 <= 55.4:
        return int((pm25 - 35.4) * 50 / (55.4 - 35.4) + 100)
    elif pm25 <= 150.4:
        return int((pm25 - 55.4) * 50 / (150.4 - 55.4) + 150)
    else:
        return 200


def get_risk_level(aqi: int, user_group="normal"):
    if aqi <= 50:
        level = "GOOD"
    elif aqi <= 100:
        level = "MODERATE"
    elif aqi <= 150:
        level = "UNHEALTHY_SENSITIVE"
    else:
        level = "UNHEALTHY"

    if user_group in ["child", "elderly"]:
        if level == "MODERATE":
            level = "UNHEALTHY_SENSITIVE"

    return level


def get_recommendation(level: str):
    mapping = {
        "GOOD": "Không khí tốt",
        "MODERATE": "Có thể hoạt động bình thường",
        "UNHEALTHY_SENSITIVE": "Nhóm nhạy cảm nên hạn chế ra ngoài",
        "UNHEALTHY": "Không nên ra ngoài",
    }
    return mapping.get(level, "")