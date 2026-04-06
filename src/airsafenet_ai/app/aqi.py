from __future__ import annotations


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
    return min(500, round((500 - 401) / (500.4 - 350.5) * (pm25 - 350.5) + 401))