from __future__ import annotations

AQI_BREAKS = [
    (0, 50, "GOOD"),
    (51, 100, "MODERATE"),
    (101, 150, "UNHEALTHY_SENSITIVE"),
    (151, 200, "UNHEALTHY"),
    (201, 300, "VERY_UNHEALTHY"),
    (301, 500, "HAZARDOUS"),
]


def aqi_to_category(aqi: int) -> str:
    aqi = int(max(0, aqi))
    for low, high, label in AQI_BREAKS:
        if low <= aqi <= high:
            return label
    return "HAZARDOUS"


def risk_for_profile(aqi: int, profile: str) -> str:
    profile = (profile or "general").lower()
    category = aqi_to_category(aqi)

    if profile == "general":
        return category

    sensitive_profiles = {"children", "elderly", "respiratory", "pregnant"}
    if profile not in sensitive_profiles:
        return category

    order = [
        "GOOD",
        "MODERATE",
        "UNHEALTHY_SENSITIVE",
        "UNHEALTHY",
        "VERY_UNHEALTHY",
        "HAZARDOUS",
    ]
    idx = order.index(category)
    idx = min(idx + 1, len(order) - 1)
    return order[idx]


def recommendation_from_aqi(aqi: int, profile: str) -> str:
    profile = (profile or "general").lower()
    risk = risk_for_profile(aqi, profile)

    person_map = {
        "general": "Người dùng",
        "children": "Trẻ em",
        "elderly": "Người cao tuổi",
        "respiratory": "Người có bệnh hô hấp",
        "pregnant": "Phụ nữ mang thai",
        "outdoor_workers": "Người làm việc ngoài trời",
    }
    person = person_map.get(profile, "Người dùng")

    messages = {
        "GOOD": f"Không khí tốt. {person} có thể sinh hoạt bình thường.",
        "MODERATE": f"Chất lượng không khí ở mức chấp nhận được. {person} nên theo dõi nếu ở ngoài trời lâu.",
        "UNHEALTHY_SENSITIVE": f"Chất lượng không khí ở mức chấp nhận được. Nhóm nhạy cảm như {person.lower()} nên cân nhắc hạn chế hoạt động ngoài trời kéo dài.",
        "UNHEALTHY": f"Không khí có thể ảnh hưởng sức khỏe. {person} nên hạn chế ra ngoài và cân nhắc đeo khẩu trang phù hợp.",
        "VERY_UNHEALTHY": f"Mức ô nhiễm cao. {person} nên tránh hoạt động ngoài trời và ưu tiên ở trong nhà.",
        "HAZARDOUS": f"Mức ô nhiễm nguy hiểm. {person} cần hạn chế tối đa ra ngoài và theo dõi sức khỏe.",
    }
    return messages[risk]