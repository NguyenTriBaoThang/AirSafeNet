import json
from app.config import FEATURE_COLS_PATH


def load_feature_columns():
    with open(FEATURE_COLS_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def build_input_vector(input_dict: dict):
    feature_cols = load_feature_columns()

    vector = []
    for col in feature_cols:
        value = input_dict.get(col, 0)
        vector.append(value)

    return vector