# AirSafeNet AI

Cấu trúc:
- `app/train.py`: train model PM2.5
- `app/predict.py`: dự đoán 24 giờ tiếp theo
- `app/aqi.py`: chuyển PM2.5 sang AQI + risk + recommendation
- `app/data_loader.py`: lấy dữ liệu thật từ Open-Meteo
- `models/`: chứa `.pkl`, metadata, sample output
- `data/`: chứa CSV dữ liệu train và forecast output

## Cách chạy

### 1) Cài thư viện
```bash
pip install -r requirements.txt
```

### 2) Train model
```bash
python -m app.main train
```

### 3) Dự đoán 24 giờ
```bash
python -m app.main predict --user-group child
```

## Output
- `models/airsafenet_pm25_model.pkl`
- `models/airsafenet_pm25_metadata.json`
- `models/sample_prediction_output.json`
- `data/hcm_air_quality_training.csv`
- `data/forecast_24h_output.csv`

## Gợi ý tích hợp ASP.NET Core
Backend chỉ cần:
1. gọi script Python train/predict
2. đọc file JSON/CSV output
3. trả API cho frontend
