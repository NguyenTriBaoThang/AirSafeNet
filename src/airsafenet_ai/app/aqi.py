def pm25_to_aqi(pm25: float) -> int:
    pm25 = max(0.0, float(pm25))

    if pm25 <= 12.0:
        return round((50 - 0) / (12.0 - 0.0) * (pm25 - 0.0) + 0)
    elif pm25 <= 35.4:
        return round((100 - 51) / (35.4 - 12.1) * (pm25 - 12.1) + 51)
    elif pm25 <= 55.4:
        return round((150 - 101) / (55.4 - 35.5) * (pm25 - 35.5) + 101)
    elif pm25 <= 150.4:
        return round((200 - 151) / (150.4 - 55.5) * (pm25 - 55.5) + 151)
    elif pm25 <= 250.4:
        return round((300 - 201) / (250.4 - 150.5) * (pm25 - 150.5) + 201)
    elif pm25 <= 350.4:
        return round((400 - 301) / (350.4 - 250.5) * (pm25 - 250.5) + 301)
    return min(
        500,
        round((500 - 401) / (500.4 - 350.5) * (pm25 - 350.5) + 401),
    )


def get_risk_level(aqi: int, user_group: str = "normal") -> str:
    if aqi <= 50:
        level = "GOOD"
    elif aqi <= 100:
        level = "MODERATE"
    elif aqi <= 150:
        level = "UNHEALTHY_SENSITIVE"
    elif aqi <= 200:
        level = "UNHEALTHY"
    elif aqi <= 300:
        level = "VERY_UNHEALTHY"
    else:
        level = "HAZARDOUS"

    if user_group in ["child", "elderly", "respiratory", "pregnant"]:
        order = [
            "GOOD",
            "MODERATE",
            "UNHEALTHY_SENSITIVE",
            "UNHEALTHY",
            "VERY_UNHEALTHY",
            "HAZARDOUS",
        ]
        idx = order.index(level)
        idx = min(idx + 1, len(order) - 1)
        return order[idx]

    return level


def get_recommendation(level: str) -> str:
    mapping = {
        "GOOD": "Không khí tốt. Có thể sinh hoạt bình thường.",
        "MODERATE": "Chất lượng không khí ở mức chấp nhận được.",
        "UNHEALTHY_SENSITIVE": "Nhóm nhạy cảm nên hạn chế ra ngoài và cân nhắc đeo khẩu trang.",
        "UNHEALTHY": "Không khí có hại cho sức khỏe. Nên hạn chế ra ngoài.",
        "VERY_UNHEALTHY": "Mức ô nhiễm rất cao. Nên tránh hoạt động ngoài trời.",
        "HAZARDOUS": "Mức ô nhiễm nguy hiểm. Nên ở trong nhà và hạn chế tối đa tiếp xúc ngoài trời.",
    }
    return mapping.get(level, "Theo dõi thêm chất lượng không khí.")