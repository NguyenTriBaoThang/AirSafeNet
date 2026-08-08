# THUYẾT MINH HOÀN CHỈNH DỰ ÁN AIRSAFENET

**Tên dự án:** AirSafeNet - Nền tảng AI quản lý chất lượng không khí, cảnh báo sức khỏe, hỗ trợ chuyển đổi xanh và giảm phát thải tại Thành phố Hồ Chí Minh.

**Định hướng chủ đề:** Net Zero, quản lý chất lượng không khí, chuyển đổi xanh, giảm phát thải, kinh tế tuần hoàn, AI ứng dụng vì sức khỏe cộng đồng.

**Loại sản phẩm:** Website/Web dashboard kết hợp AI server, backend API, bản đồ dữ liệu, trợ lý ảo và hệ thống cảnh báo theo ngữ cảnh.

**Phạm vi áp dụng:** Người dân đô thị, phụ huynh, học sinh, người cao tuổi, người mắc bệnh hô hấp, người đi làm bằng xe máy, người tập thể thao ngoài trời, trường học, ban tổ chức sự kiện ngoài trời và nhà quản lý môi trường.

**Mục tiêu cốt lõi:** Không chỉ hiển thị AQI/PM2.5, AirSafeNet biến dữ liệu chất lượng không khí thành quyết định hành động: giờ nào nên ra ngoài, giờ nào nên tránh, có cần khẩu trang không, hoạt động trường học có nên tổ chức không, tuyến đường nào ít ô nhiễm hơn, phương tiện nào cân bằng giữa sức khỏe và phát thải CO2.

## Mục lục nội dung

1. Tên dự án và định hướng tổng thể.
2. Vấn đề thực tiễn cần giải quyết.
3. Mục tiêu, đối tượng hưởng lợi và phạm vi áp dụng.
4. Kiến trúc hệ thống, nguồn dữ liệu và cơ chế độ tin cậy.
5. AI forecast, anomaly detection, explainability và cache/fallback.
6. Dashboard, bản đồ nhiệt, bản đồ sạch, clean route và so sánh khu vực.
7. Daily Safety Briefing, What-if Activity Simulator, Dose Budget và Activity Planner.
8. Health Profiles, Family Profiles, cảnh báo theo ngữ cảnh và Alert Inbox.
9. School Green Safety Mode, School/Outdoor Event Mode và hành động xanh.
10. Net Zero Mobility, giảm phát thải, kinh tế tuần hoàn và Impact Dashboard.
11. AI Assistant, Data Trust Card, intent actions và fallback AI.
12. Tính mới, tính khả thi, hiệu quả xã hội, khả năng mở rộng và kết luận.
## 1. Tên dự án

**AirSafeNet - Nền tảng AI quản lý chất lượng không khí, cảnh báo sớm sức khỏe, hỗ trợ chuyển đổi xanh và giảm phát thải tại Thành phố Hồ Chí Minh.**

AirSafeNet là hệ thống web ứng dụng trí tuệ nhân tạo nhằm theo dõi, dự báo, giải thích và đưa ra khuyến nghị hành động dựa trên chất lượng không khí. Thay vì chỉ hiển thị chỉ số AQI/PM2.5 dưới dạng con số, AirSafeNet chuyển dữ liệu môi trường thành quyết định thực tế cho người dân, trường học, người đi làm, người tập thể thao ngoài trời và các nhóm nhạy cảm như trẻ em, người cao tuổi, người mắc bệnh hô hấp, phụ nữ mang thai.

Dự án đồng thời tích hợp định hướng **Net Zero, chuyển đổi xanh, giảm phát thải và kinh tế tuần hoàn** thông qua các module đánh giá phát thải giao thông, lựa chọn tuyến đường ít ô nhiễm, khuyến nghị phương tiện cân bằng giữa sức khỏe và CO2, thống kê tác động giảm phơi nhiễm PM2.5 và ghi nhận hành động xanh trong sinh hoạt, trường học, sự kiện ngoài trời.

## 2. Vấn đề thực tiễn cần giải quyết

Ô nhiễm không khí, đặc biệt là bụi mịn PM2.5, đang ảnh hưởng trực tiếp đến sức khỏe cộng đồng tại các đô thị lớn. Nhiều ứng dụng hiện nay chỉ dừng lại ở việc hiển thị AQI hiện tại, người dùng nhìn thấy chỉ số nhưng chưa biết cần làm gì tiếp theo: có nên ra ngoài hay không, có nên cho trẻ tập thể dục ngoài trời không, người hen/suyễn cần đeo khẩu trang loại nào, nên dời lịch sang giờ nào, đi tuyến đường nào ít phơi nhiễm hơn.

Các quyết định hằng ngày như đưa con đi học, đi làm bằng xe máy, chạy bộ buổi sáng, đá bóng, tổ chức sinh hoạt ngoài trời hoặc chọn phương tiện di chuyển đều có liên quan đến chất lượng không khí. Nếu thiếu thông tin theo ngữ cảnh, người dân dễ ra quyết định sai thời điểm, làm tăng phơi nhiễm PM2.5 và tăng rủi ro sức khỏe.

AirSafeNet giải quyết vấn đề này bằng cách kết hợp dữ liệu AQI/PM2.5, thời tiết, dự báo theo giờ, hồ sơ sức khỏe, lịch hoạt động, bản đồ khu vực và phát thải giao thông để đưa ra khuyến nghị rõ ràng, dễ hiểu và có thể hành động ngay.

## 3. Mục tiêu dự án

Mục tiêu tổng quát của AirSafeNet là xây dựng một nền tảng AI hỗ trợ quản lý chất lượng không khí theo hướng chủ động, cá nhân hóa và có khả năng đo lường tác động.

Các mục tiêu cụ thể gồm:

1. Theo dõi và dự báo chất lượng không khí tại TP.HCM theo thời gian.
2. Biến dữ liệu AQI/PM2.5 thành khuyến nghị hành động cụ thể cho từng nhóm người dùng.
3. Cảnh báo sớm các tình huống nguy cơ như PM2.5 tăng bất thường, AQI cao, dữ liệu hôm nay xấu hơn trung bình 7 ngày, hoặc người dùng có lịch ra ngoài trong khung giờ ô nhiễm.
4. Hỗ trợ trường học và sự kiện ngoài trời ra quyết định tổ chức, dời giờ, chuyển vào trong nhà hoặc chuẩn bị khẩu trang.
5. So sánh tuyến đường và phương tiện di chuyển theo cả rủi ro sức khỏe và lượng phát thải CO2.
6. Tạo dashboard đo lường tác động: số cảnh báo đã gửi, số hoạt động được dời sang giờ an toàn, phút phơi nhiễm PM2.5 giảm, phần trăm dose budget giảm, kg CO2 avoided và số hành động xanh hoàn thành.
7. Tăng độ tin cậy bằng cơ chế nhiều nguồn dữ liệu, cache/fallback, nhãn dữ liệu và bảng giải thích minh bạch.

## 4. Đối tượng hưởng lợi

AirSafeNet hướng đến các nhóm người dùng thực tế tại đô thị:

- **Người dân TP.HCM:** cần biết hôm nay giờ nào nên ra ngoài, giờ nào nên tránh, có cần khẩu trang không.
- **Trẻ em đi học:** phụ huynh và nhà trường cần quyết định giờ đưa đón, thể dục, ra chơi, hoạt động ngoại khóa.
- **Người cao tuổi:** cần hạn chế phơi nhiễm khi đi bộ, đi chợ, khám bệnh hoặc sinh hoạt ngoài trời.
- **Người mắc bệnh hô hấp, hen/suyễn:** cần cảnh báo sớm khi PM2.5 tăng hoặc AQI vượt ngưỡng nhạy cảm.
- **Phụ nữ mang thai:** cần khuyến nghị thận trọng khi phải di chuyển hoặc đứng ngoài trời lâu.
- **Người đi làm bằng xe máy:** cần chọn giờ đi, tuyến đường và khẩu trang phù hợp do phơi nhiễm trực tiếp với bụi đường.
- **Người tập thể thao ngoài trời:** cần biết lúc nào có thể chạy bộ, đá bóng, đạp xe hoặc nên chuyển vào trong nhà.
- **Trường học, Đoàn/Hội, ban tổ chức sự kiện:** cần công cụ quyết định tổ chức/hoãn/đổi giờ hoạt động ngoài trời.
- **Nhà quản lý môi trường:** cần dashboard tổng hợp, bản đồ vùng rủi ro, dữ liệu nguồn và chỉ số tác động.

## 5. Kiến trúc tổng thể hệ thống

AirSafeNet được xây dựng theo mô hình 3 lớp:

1. **Frontend Web Dashboard:** React + TypeScript + Vite, cung cấp giao diện người dùng, dashboard, bản đồ, trợ lý ảo, lịch hoạt động, hồ sơ sức khỏe và các công cụ mô phỏng.
2. **Backend API:** ASP.NET Core, xử lý xác thực JWT, lưu dữ liệu người dùng, lịch hoạt động, hồ sơ gia đình, cảnh báo, hội thoại trợ lý ảo, điều phối nguồn dữ liệu và kết nối AI server.
3. **AI Server:** FastAPI Python, thực hiện dự báo, xử lý cache, anomaly detection, mô hình dự báo PM2.5/AQI và các dữ liệu phục vụ dashboard.

Luồng dữ liệu chính:

- AI server thu thập hoặc đọc dữ liệu từ cache, tính toán dự báo AQI/PM2.5 theo giờ.
- Backend lấy dữ liệu dự báo, current, history và health profile để tính rủi ro, cảnh báo, dose budget, trust score.
- Frontend hiển thị dữ liệu dưới dạng dashboard, bản đồ, biểu đồ, thẻ khuyến nghị và trợ lý ảo.
- Người dùng tương tác qua lịch hoạt động, hồ sơ gia đình, bản đồ, mô phỏng hoạt động, trợ lý ảo và hệ thống cảnh báo.

## 6. Nguồn dữ liệu và cơ chế độ tin cậy

AirSafeNet định hướng dùng nhiều nguồn dữ liệu để tăng độ tin cậy:

- **Open-Meteo:** cung cấp dữ liệu thời tiết như nhiệt độ, độ ẩm, gió, áp suất, UV, mây.
- **OpenAQ:** định hướng tích hợp dữ liệu quan trắc mở về chất lượng không khí.
- **AirSafeNet AI Cache:** lưu kết quả dự báo, history, current data để hệ thống vẫn hoạt động khi API ngoài bị lỗi.
- **Nguồn trạm quan trắc chính thống:** có thể tích hợp ở giai đoạn triển khai thực tế.
- **Fallback cache:** khi nguồn dữ liệu bị lỗi, app không ẩn dữ liệu mà gắn nhãn stale/fallback để người dùng biết mức độ tin cậy.

Mỗi dữ liệu được gắn nhãn như:

- **real-time:** dữ liệu mới/cập nhật gần thời điểm hiện tại.
- **forecast:** dữ liệu dự báo theo giờ.
- **estimated:** dữ liệu nội suy hoặc ước tính từ mô hình.
- **stale:** dữ liệu cũ, dùng tạm khi API lỗi.
- **fallback cache:** dữ liệu cache được dùng thay thế khi nguồn chính không phản hồi.

Người dùng có thể xem nguồn dữ liệu, thời điểm cập nhật, độ tin cậy và lý do hệ thống đưa ra cảnh báo.

## 7. Nền tảng AI và dự báo

AirSafeNet sử dụng mô hình dự báo chất lượng không khí theo hướng ensemble AI, kết hợp nhiều phương pháp để tăng độ ổn định:

- **Random Forest:** học quan hệ phi tuyến giữa PM2.5, thời tiết và các yếu tố lịch sử.
- **ARIMA:** khai thác đặc trưng chuỗi thời gian, xu hướng và chu kỳ.
- **XGBoost Lite:** tăng khả năng dự báo trong các tình huống biến động phức tạp.
- **Dynamic weighting:** trọng số mô hình có thể điều chỉnh dựa trên sai số gần nhất.
- **Cache theo chu kỳ:** dự báo được tính định kỳ, giảm tải cho hệ thống và tránh tính AI nặng trên từng request.

Hệ thống cung cấp:

- Dự báo AQI/PM2.5 theo giờ.
- Dự báo 24h/7 ngày.
- So sánh forecast với thực tế.
- Tính độ tin cậy dữ liệu.
- Phát hiện spike PM2.5 bất thường.
- Giải thích yếu tố ảnh hưởng như PM2.5 lịch sử, gió, độ ẩm, UV, nhiệt độ, áp suất.

## 8. Dashboard tổng quan

Dashboard là màn hình trung tâm giúp người dùng nhìn nhanh tình hình không khí hiện tại và dự báo.

Các chức năng chính:

- Hiển thị AQI hiện tại, PM2.5, mức rủi ro và khuyến nghị sức khỏe.
- Hiển thị forecast theo giờ bằng biểu đồ trực quan.
- Hiển thị thông tin thời tiết liên quan: nhiệt độ, độ ẩm, gió, UV, áp suất, mây.
- Hiển thị cảnh báo anomaly nếu PM2.5 tăng bất thường.
- Hiển thị bảng giải thích AI về yếu tố ảnh hưởng đến dự báo.
- Hiển thị Daily Safety Briefing, What-if Simulator, Commute Planner, Net Zero, Trust Panel, School Green Safety Mode, Impact Dashboard và các module mở rộng.

Dashboard giúp người dùng trả lời các câu hỏi thực tế:

- Hôm nay có nên ra ngoài không?
- Giờ nào trong ngày sạch hơn?
- Nhóm nhạy cảm cần chú ý gì?
- Có nên đeo khẩu trang không?
- Hoạt động ngoài trời có nên dời lịch không?

## 9. Daily Safety Briefing

Daily Safety Briefing là bản tóm tắt an toàn mỗi ngày, biến forecast thành lời khuyên dễ hiểu.

Chức năng:

- Tự động tóm tắt tình hình không khí trong ngày.
- Gợi ý giờ nên ra ngoài.
- Gợi ý giờ nên tránh.
- Đưa khuyến nghị riêng cho nhóm nhạy cảm.
- Cho biết có cần khẩu trang hay không.
- Ước tính mức dose budget PM2.5 trong ngày.
- Gợi ý hành động như dời lịch, giảm thời lượng, chuyển vào trong nhà.

Ví dụ: nếu AQI buổi sáng cao nhưng giảm vào 8:30, hệ thống có thể khuyến nghị dời hoạt động ngoài trời sang 8:30 hoặc buổi chiều, đồng thời nhắc nhóm hen/suyễn đeo N95 nếu bắt buộc ra ngoài.

## 10. Air Quality Management Panel

Module quản lý chất lượng không khí chuyển dữ liệu kỹ thuật thành quyết định hành động.

Chức năng:

- Phân tích AQI/PM2.5 hiện tại và dự báo theo giờ.
- Gợi ý giờ nên ra ngoài và giờ nên tránh.
- Đưa khuyến nghị cho trường học: có nên tổ chức thể dục, sinh hoạt ngoài trời, đá bóng, hoạt động Đoàn/Hội hay không.
- Đưa khuyến nghị cho nhóm nhạy cảm: đeo khẩu trang, giảm thời lượng, đổi lịch hoặc ở trong nhà.
- Tính dose budget dự kiến dựa trên PM2.5 và thời gian phơi nhiễm.

Điểm mạnh của module này là không chỉ báo “AQI cao” mà trả lời câu hỏi “người dùng nên làm gì ngay bây giờ”.

## 11. What-if Activity Simulator

What-if Activity Simulator cho phép người dùng mô phỏng rủi ro nếu thực hiện một hoạt động cụ thể.

Người dùng có thể chọn:

- Hoạt động: chạy bộ, đi học, đi làm, đá bóng.
- Thời lượng hoạt động.
- Quận/huyện hoặc khu vực.
- Nhóm sức khỏe: trẻ em, người hen/suyễn, người cao tuổi, thai phụ, người đi xe máy, người bình thường.

App trả về:

- Rủi ro nếu làm ngay bây giờ.
- Rủi ro nếu dời sang giờ khác.
- Gợi ý 3 khung giờ tốt hơn.
- Dose budget bị tiêu hao bao nhiêu phần trăm.
- Khuyến nghị cụ thể: dời giờ, giảm thời lượng, đeo khẩu trang, chuyển vào trong nhà.

Đây là chức năng thể hiện rõ tính cá nhân hóa vì cùng một AQI nhưng trẻ em, người hen/suyễn và người khỏe mạnh sẽ nhận khuyến nghị khác nhau.

## 12. Trust & Explainability Panel

Trust & Explainability Panel giúp người dùng hiểu vì sao hệ thống đưa ra dự báo hoặc cảnh báo.

Các thông tin được hiển thị:

- Dữ liệu cập nhật lúc nào.
- Nguồn dữ liệu nào đang được dùng.
- Model confidence/độ tin cậy.
- Yếu tố ảnh hưởng chính: PM2.5, gió, độ ẩm, UV, nhiệt độ, áp suất.
- Cảnh báo đến từ forecast, real-time spike hay fallback cache.
- Tình trạng dữ liệu: real-time, forecast, estimated, stale.

Module này giúp AirSafeNet minh bạch hơn, giảm cảm giác “AI nói đại” và phù hợp với yêu cầu của các dự án có yếu tố AI ứng dụng thực tế.

## 13. Health Profiles và Family Profiles

AirSafeNet cho phép cá nhân hóa theo hồ sơ sức khỏe. Mỗi nhóm có ngưỡng cảnh báo, quy tắc khẩu trang, giới hạn thời gian ngoài trời và hệ số nhạy cảm riêng.

Các nhóm chính:

- Người dùng phổ thông.
- Trẻ em đi học.
- Người cao tuổi.
- Người có hen/suyễn hoặc bệnh hô hấp.
- Người tập thể thao ngoài trời.
- Người đi làm bằng xe máy.
- Phụ nữ mang thai.

Family Profiles mở rộng khả năng theo dõi nhiều người trong một tài khoản, ví dụ phụ huynh có thể theo dõi con nhỏ, ông bà, người bệnh hô hấp trong gia đình.

Chức năng:

- Tạo hồ sơ thành viên gia đình.
- Gán nhóm sức khỏe, độ tuổi, lịch hoạt động hoặc mức nhạy cảm.
- Tính rủi ro riêng cho từng người.
- Cảnh báo nếu một thành viên có nguy cơ cao trong khung giờ sắp tới.
- Gợi ý hành động cụ thể theo từng hồ sơ.

Ví dụ: cùng một khung giờ AQI 105, người bình thường có thể ra ngoài ngắn, nhưng trẻ em hoặc người hen/suyễn nên giảm thời gian, đeo N95 hoặc dời lịch.

## 14. Activity Planner và Smart Schedule Optimizer

Activity Planner giúp người dùng lên lịch hoạt động cá nhân theo chất lượng không khí.

Chức năng:

- Tạo lịch hoạt động: đi học, đi làm, chạy bộ, đi bộ, đá bóng, sinh hoạt ngoài trời.
- Chọn giờ, thời lượng, cường độ, hoạt động trong nhà/ngoài trời.
- Tính risk score dựa trên AQI/PM2.5, thời lượng, cường độ và nhóm sức khỏe.
- Smart Schedule Optimizer đề xuất top 3 khung giờ an toàn hơn.
- Golden Hour Picker hiển thị thanh 24h để chọn giờ sạch nhất.
- Weekly Planner hiển thị lịch tuần với nền AQI theo giờ.
- Weekly Risk Matrix so sánh rủi ro theo ngày/giờ.
- Pattern Insight phát hiện thói quen thường rơi vào giờ AQI xấu.
- Exposure Log ghi nhận phơi nhiễm theo ngày.

Module này biến forecast thành kế hoạch sống hằng ngày.

## 15. WHO Dose Budget

WHO Dose Budget là cách AirSafeNet lượng hóa phơi nhiễm PM2.5 thành “ngân sách trong ngày”.

Hệ thống tính:

- PM2.5 trung bình.
- Thời gian phơi nhiễm.
- Cường độ hoạt động.
- Vị trí trong nhà/ngoài trời.
- Hệ số nhạy cảm theo hồ sơ sức khỏe.

Kết quả trả về:

- Lượng dose PM2.5 ước tính.
- Tỷ lệ phần trăm so với budget ngày.
- Cảnh báo nếu hoạt động làm tiêu hao dose quá nhanh.
- Gợi ý giảm dose bằng cách đổi giờ, giảm thời lượng hoặc chuyển vào trong nhà.

Ví dụ: chạy bộ 60 phút khi PM2.5 cao có thể tiêu hao nhiều dose hơn đi bộ 20 phút ở giờ sạch hơn. Đây là chỉ số giúp người dùng hiểu tác động sức khỏe theo cách định lượng.

## 16. Cảnh báo thông minh theo ngữ cảnh

AirSafeNet không chỉ cảnh báo “AQI cao” mà cảnh báo theo tình huống thực tế.

Các ngữ cảnh cảnh báo:

- Trẻ em sắp đi học.
- Người bệnh hô hấp có lịch ra ngoài.
- Người dùng chuẩn bị chạy bộ hoặc đá bóng.
- Người đi làm bằng xe máy trong giờ cao điểm.
- PM2.5 tăng bất thường trong 1-2 giờ.
- Dữ liệu hôm nay xấu hơn trung bình 7 ngày.
- Hoạt động ngoài trời của trường học rơi vào giờ AQI cao.

Mỗi cảnh báo có:

- Lý do cảnh báo.
- Mức độ ưu tiên.
- Nguồn dữ liệu.
- Độ tin cậy.
- Hành động khuyến nghị.

Ví dụ hành động cụ thể:

- Dời sang 16:00.
- Đeo N95.
- Giảm thời lượng còn 30 phút.
- Ở trong nhà đến 10:00.
- Chuyển tiết thể dục vào trong nhà.

## 17. Alert Inbox

Alert Inbox lưu lịch sử cảnh báo để người dùng không bỏ sót thông tin quan trọng.

Chức năng:

- Hiển thị danh sách cảnh báo đã gửi.
- Có trạng thái đã đọc/chưa đọc.
- Hiển thị lý do cảnh báo.
- Hiển thị hành động khuyến nghị.
- Hiển thị thời điểm, nguồn dữ liệu và độ tin cậy.
- Giúp người dùng xem lại các quyết định đã được khuyến nghị.

Alert Inbox làm hệ thống trở nên thực tế hơn vì cảnh báo không biến mất sau khi hiện popup.

## 18. Anomaly Detection và XAI Spike Alert

AirSafeNet có khả năng phát hiện bất thường khi PM2.5 tăng nhanh so với xu hướng gần đây.

Chức năng:

- Phát hiện spike PM2.5 theo thời gian thực.
- So sánh với lookback window để xác định tăng bất thường.
- Có cooldown để tránh spam cảnh báo.
- Hiển thị XAI explanation: yếu tố nào đang góp phần làm AQI/PM2.5 xấu hơn.
- Nếu người dùng đang có hoạt động ngoài trời, hệ thống có thể hiển thị interrupt alert yêu cầu dừng, giảm cường độ hoặc vào trong nhà.

Ví dụ: người dùng đang chạy bộ, PM2.5 tăng mạnh trong 1 giờ, app sẽ cảnh báo dừng hoạt động, đeo khẩu trang và vào trong nhà.

## 19. Forecast Accuracy Score

Forecast Accuracy Score giúp tăng niềm tin vào hệ thống dự báo.

Chức năng:

- So sánh dự báo hôm qua với dữ liệu thực tế hôm nay.
- Tính các chỉ số như MAE, RMSE hoặc accuracy percentage.
- Hiển thị chất lượng dự báo gần đây.
- Giúp người dùng biết forecast hôm nay đáng tin đến mức nào.
- Là cơ sở điều chỉnh confidence cho cảnh báo và Trust Panel.

Đây là điểm quan trọng khi thuyết minh với Ban tổ chức vì chứng minh dự án có cơ chế tự đánh giá, không chỉ hiển thị kết quả AI một chiều.

## 20. Bản đồ nhiệt chất lượng không khí

Heatmap hiển thị chất lượng không khí theo khu vực địa lý.

Chức năng:

- Hiển thị bản đồ TP.HCM mới theo phường/xã/đặc khu.
- Mỗi vùng có màu theo mức AQI/PM2.5:
  - Xanh: tốt.
  - Vàng: trung bình.
  - Cam: không tốt cho nhóm nhạy cảm.
  - Đỏ: không tốt.
  - Tím: rất xấu.
- Có ranh giới vùng rõ ràng.
- Có nền bản đồ kiểu GIS/Google Map để người dùng định vị trực quan.
- Có zoom bằng nút, zoom bằng chuột và kéo bản đồ.
- Click vào phường/xã để xem thông tin chi tiết.
- Có chế độ chọn 2-3 phường để so sánh.

Khi bấm vào một phường/xã, app hiển thị:

- AQI hiện tại.
- PM2.5.
- Dữ liệu cập nhật lúc nào.
- Nguồn dữ liệu.
- Độ tin cậy.
- Khuyến nghị cho trẻ em, người hen/suyễn, người đi xe máy.
- Giờ nào trong ngày khu vực đó sạch hơn.

Bản đồ có 3 cấp độ ý tưởng:

1. **Cấp thành phố:** xem toàn cảnh TP.HCM, top khu vực sạch nhất/xấu nhất.
2. **Cấp phường/xã:** xem ranh giới rõ, AQI trung bình, dự báo 24h, điểm nhạy cảm nếu có dữ liệu.
3. **Cấp tuyến đường:** xem đoạn đường màu theo ô nhiễm, clean corridor và đoạn nên tránh.

## 21. District/Ward Comparison

Chức năng so sánh khu vực giúp người dùng chọn nơi phù hợp cho hoạt động ngoài trời.

Người dùng có thể chọn 2-3 phường/xã để so sánh:

- AQI trung bình.
- PM2.5.
- Độ tin cậy dữ liệu.
- Điểm ngoài trời.
- Khuyến nghị theo nhóm sức khỏe.
- Khung giờ sạch hơn.

Ứng dụng thực tế:

- Chọn công viên/khu vực tập thể thao.
- Chọn điểm tổ chức hoạt động ngoài trời.
- So sánh khu vực trường học, nhà ở, nơi làm việc.

## 22. Clean Map và Cleanest Route Planner

Clean Map là bản đồ định hướng tìm tuyến đường tốt cho sức khỏe.

Người dùng nhập:

- Điểm đi A.
- Điểm đến B.
- Giờ xuất phát.
- Phương tiện: xe máy, đi bộ, xe đạp, xe buýt, ô tô, đi chung xe.
- Hồ sơ sức khỏe: trẻ em, hen/suyễn, người cao tuổi, thai phụ, người đi xe máy.

App trả về 3 tuyến:

1. **Nhanh nhất:** tối ưu thời gian.
2. **Ít ô nhiễm nhất:** giảm phơi nhiễm PM2.5 tối đa.
3. **Cân bằng nhất:** không vòng quá xa nhưng giảm rủi ro đáng kể.

Mỗi tuyến có **Health Route Score** dựa trên:

- PM2.5 exposure.
- Thời gian di chuyển.
- Loại đường.
- Hồ sơ sức khỏe.
- Độ tin cậy dữ liệu.
- Phương tiện.
- Đi qua vùng AQI cao hay thấp.

App không chỉ né đường xa mà còn né:

- Vùng AQI cao.
- Vùng PM2.5 cao.
- Đường lớn nhiều xe tải/xe máy.
- Khu vực gần công trường/khu công nghiệp.
- Khu vực đang có spike bất thường.

App ưu tiên:

- Tuyến qua vùng AQI thấp hơn.
- Tuyến gần công viên/kênh/rộng thoáng nếu dữ liệu cho thấy tốt hơn.
- Đường nhỏ ít xe hơn.
- Giờ xuất phát sạch hơn.

Ví dụ: nếu đi lúc 7:30 có exposure cao, app có thể gợi ý dời sang 8:45 vì PM2.5 dự kiến giảm 22%.

## 23. Commute Safety Planner

Commute Safety Planner tập trung vào các chuyến đi học/đi làm hằng ngày.

Chức năng:

- Chọn giờ đi, thời lượng, phương tiện và hồ sơ sức khỏe.
- So sánh rủi ro theo nhiều khung giờ.
- Gợi ý đi sớm hơn hoặc muộn hơn để giảm phơi nhiễm.
- Tính dose budget cho chuyến đi.
- Đưa khuyến nghị khẩu trang và tuyến đường.

Ví dụ: người đi làm bằng xe máy có thể được khuyến nghị đeo N95, tránh giờ kẹt xe, hoặc dời giờ đi khi PM2.5 đang tăng.

## 24. Net Zero & Mobility Emission Module

AirSafeNet tích hợp yếu tố Net Zero bằng cách so sánh rủi ro sức khỏe và phát thải giao thông.

Các phương tiện được hỗ trợ:

- Xe máy.
- Ô tô.
- Xe buýt.
- Đi bộ.
- Xe đạp.
- Đi chung xe.

App tính và so sánh:

- CO2 phát thải.
- PM2.5 exposure.
- Thời gian di chuyển.
- Chi phí sức khỏe ước tính.
- Tính phù hợp theo AQI hiện tại.

Ví dụ:

- Xe đạp gần như không phát thải CO2 nhưng không nên chọn khi AQI cao.
- Xe buýt có CO2/người thấp hơn và exposure thấp hơn nếu ngồi trong xe.
- Xe máy nhanh nhưng exposure và CO2 cao hơn.

App đưa ra phương án “vừa sạch cho sức khỏe, vừa ít phát thải”, giúp kết nối quản lý không khí với chuyển đổi xanh.

## 25. School Green Safety Mode

School Green Safety Mode hỗ trợ trường học ra quyết định với hoạt động ngoài trời.

Người dùng nhập:

- Loại hoạt động: tiết thể dục, đá bóng, sinh hoạt Đoàn/Hội, sự kiện ngoài trời.
- Thời lượng.
- Số học sinh/người tham gia.
- Giờ tổ chức.
- Địa điểm: sân trường, ven đường, khu có bóng mát, có phương án trong nhà.

App trả về:

- Nên tổ chức, đổi giờ, chuyển trong nhà hay chuẩn bị khẩu trang.
- Mức rủi ro theo AQI/PM2.5.
- Dose budget của hoạt động.
- Số phút phơi nhiễm PM2.5 có thể giảm nếu đổi giờ.
- Khuyến nghị cho phụ huynh và nhà trường.
- Nhắc phụ huynh tắt máy khi chờ trước cổng trường để giảm khí thải cục bộ.

Module này có tính ứng dụng cao vì trường học là nơi tập trung nhiều trẻ em, nhóm nhạy cảm với ô nhiễm không khí.

## 26. School/Outdoor Event Mode

School/Outdoor Event Mode mở rộng cho các sự kiện ngoài trời.

Chức năng:

- Nhập thông tin sự kiện ngoài trời.
- Đánh giá rủi ro theo giờ tổ chức.
- Gợi ý hoãn, đổi giờ, chuyển vào trong nhà hoặc chuẩn bị khẩu trang.
- Đưa danh sách vật dụng nên chuẩn bị.
- Đánh giá tác động nếu đổi giờ.
- Ghi nhận hành động xanh sau sự kiện.

Ví dụ: sinh hoạt Đoàn/Hội vào sáng sớm nếu AQI cao có thể được khuyến nghị chuyển sang khung giờ AQI thấp hơn hoặc chuyển hoạt động vào hội trường.

## 27. Kinh tế tuần hoàn và Green Actions

AirSafeNet không mở rộng kinh tế tuần hoàn quá xa, mà gắn nhẹ vào hành vi xanh liên quan đến trường học và sự kiện ngoài trời.

Các hành động xanh có thể ghi nhận:

- Dùng bình nước cá nhân.
- Hạn chế đồ dùng một lần.
- Phân loại rác sau sự kiện.
- Ưu tiên vật dụng tái sử dụng.
- Nhắc tắt máy xe khi chờ trước cổng trường.
- Đi chung xe hoặc chọn phương tiện phát thải thấp khi phù hợp.

Hệ thống ghi nhận “green actions completed” để đưa vào Impact Dashboard. Cách tiếp cận này giúp dự án bám yêu cầu kinh tế tuần hoàn nhưng không làm lệch trọng tâm chính là không khí sạch và sức khỏe cộng đồng.

## 28. Impact Dashboard

Impact Dashboard là phần đo lường tác động của dự án.

Các chỉ số hiển thị:

- Số cảnh báo đã gửi.
- Số hoạt động được đổi sang giờ an toàn.
- Số phút phơi nhiễm PM2.5 giảm được.
- Phần trăm dose budget giảm.
- Kg CO2 avoided.
- Số hành động xanh đã hoàn thành.
- Nhóm hưởng lợi: trẻ em, người hen/suyễn, người cao tuổi, người đi xe máy, thai phụ.

Đây là phần quan trọng để trả lời câu hỏi của Ban giám khảo: “Dự án có tạo tác động đo được không?”.

## 29. AI Assistant - Trợ lý ảo AirSafeNet

Trợ lý ảo giúp người dùng hỏi bằng ngôn ngữ tự nhiên thay vì phải tự đọc biểu đồ.

Người dùng có thể hỏi:

- “Mai con em đi học lúc 7h có ổn không?”
- “Chiều nay chạy bộ được không?”
- “Người hen/suyễn có nên ra ngoài không?”
- “Đi xe máy giờ nào ít bụi hơn?”
- “Có cần đeo N95 hôm nay không?”
- “Tìm giờ sạch hơn cho đá bóng.”
- “So sánh tuyến đường ít ô nhiễm hơn.”

Trợ lý ảo được nối với các module thực tế:

- School Green Safety Mode.
- Family Profiles.
- Dose Budget.
- Commute Safety Planner.
- Clean Map.
- Net Zero Mobility.
- Alert Inbox.
- Air Quality Management.

Mỗi câu trả lời có **Data Trust Card** gồm:

- Dữ liệu cập nhật lúc nào.
- Nguồn dữ liệu.
- Độ tin cậy.
- AQI/PM2.5 hiện tại.
- Mốc forecast được dùng.
- Provider AI.
- Fallback level.
- Module liên quan.
- Dose budget nếu có.

Trợ lý cũng có các nút hành động nhanh:

- Tạo cảnh báo.
- Xem trên bản đồ.
- Tìm giờ sạch hơn.
- So sánh tuyến đường.

Cơ chế fallback:

1. Ưu tiên Gemini.
2. Nếu Gemini lỗi, dùng OpenAI fallback.
3. Nếu cả hai lỗi, dùng rule-based local answer dựa trên AQI/PM2.5, forecast, hồ sơ sức khỏe và dose budget.

Nhờ đó, trợ lý không bị phụ thuộc hoàn toàn vào một nhà cung cấp AI và vẫn có thể đưa khuyến nghị an toàn khi API ngoài gặp sự cố.

## 30. User Preferences và Notification

Người dùng có thể cấu hình:

- Nhóm sức khỏe.
- Ngưỡng nhận cảnh báo.
- Kênh nhận thông báo.
- Email/Telegram.
- Hồ sơ gia đình.
- Tùy chọn thông báo theo lịch hoạt động.

Hệ thống hỗ trợ gửi cảnh báo qua dashboard, email hoặc Telegram tùy cấu hình. Nội dung cảnh báo không chỉ có chỉ số AQI mà kèm lý do và hành động khuyến nghị.

## 31. Admin và vận hành hệ thống

Trang Admin hỗ trợ vận hành hệ thống AI:

- Kiểm tra trạng thái cache.
- Kích hoạt compute lại dữ liệu dự báo.
- Theo dõi trạng thái AI server.
- Tính heatmap khu vực.
- Kiểm tra anomaly log.
- Phục vụ demo và vận hành thử nghiệm.

Cơ chế cache giúp hệ thống giảm tải và ổn định hơn vì frontend/backend không phải gọi mô hình AI nặng trên mỗi request.

## 32. Guide Page và giáo dục cộng đồng

AirSafeNet có phần hướng dẫn PM2.5/AQI giúp người dùng hiểu:

- AQI là gì.
- PM2.5 là gì.
- Vì sao bụi mịn nguy hiểm.
- Khi nào cần đeo khẩu trang.
- Nhóm nhạy cảm cần làm gì.
- Các mức màu AQI có ý nghĩa gì.
- Làm thế nào để giảm phơi nhiễm trong sinh hoạt hằng ngày.

Đây là yếu tố giáo dục cộng đồng, giúp người dân không chỉ dùng app mà còn hiểu cách tự bảo vệ sức khỏe.

## 33. Điểm mới và khác biệt của AirSafeNet

AirSafeNet khác với các ứng dụng xem AQI thông thường ở các điểm sau:

1. **Từ xem chỉ số sang ra quyết định:** app không chỉ hiển thị AQI mà nói người dùng nên làm gì.
2. **Cá nhân hóa theo sức khỏe:** mỗi nhóm người dùng có rule riêng về ngưỡng cảnh báo, khẩu trang và thời gian ngoài trời.
3. **Có dose budget:** lượng hóa phơi nhiễm PM2.5 theo thời lượng hoạt động.
4. **Có bản đồ theo khu vực:** so sánh khu vực, xem vùng ô nhiễm cao/thấp, hỗ trợ chọn nơi hoạt động.
5. **Có clean route:** chọn tuyến đường không chỉ nhanh mà ít ô nhiễm hơn.
6. **Kết hợp Net Zero:** so sánh phương tiện theo CO2 và exposure.
7. **Có explainability:** dữ liệu, nguồn, confidence và yếu tố ảnh hưởng được hiển thị rõ.
8. **Có tác động đo được:** Impact Dashboard thống kê phơi nhiễm giảm, CO2 avoided và hành động xanh.
9. **Có trợ lý ảo hành động:** người dùng hỏi tự nhiên và nhận nút hành động như tạo cảnh báo, xem bản đồ, tìm giờ sạch hơn.
10. **Có fallback dữ liệu và AI:** không phụ thuộc một nguồn duy nhất.

## 34. Tính khả thi triển khai

AirSafeNet có tính khả thi vì:

- Dùng kiến trúc web phổ biến: React, ASP.NET Core, FastAPI.
- Có cache để giảm chi phí tính toán AI.
- Có thể chạy local, server trường/lab hoặc cloud.
- Có thể mở rộng nguồn dữ liệu chính thống sau.
- Có thể tích hợp OpenAQ, Open-Meteo, trạm quan trắc, dữ liệu giao thông.
- Có thể triển khai thử nghiệm tại trường học, khu dân cư, nhóm phụ huynh hoặc người đi làm.
- Không yêu cầu thiết bị phần cứng riêng trong giai đoạn đầu, nhưng có thể mở rộng thêm cảm biến IoT sau.

## 35. Tính bền vững và chuyển đổi xanh

AirSafeNet đóng góp cho chuyển đổi xanh bằng cách:

- Khuyến khích chọn phương tiện phát thải thấp khi điều kiện không khí cho phép.
- Cảnh báo khi xe đạp/đi bộ không phù hợp do AQI cao, tránh khuyến nghị xanh nhưng hại sức khỏe.
- Gợi ý xe buýt/đi chung xe trong một số tình huống để giảm CO2/người.
- Nhắc phụ huynh tắt máy xe khi chờ trước cổng trường.
- Ghi nhận hành động xanh trong sự kiện trường học.
- Đo lường kg CO2 avoided và số green actions completed.

Dự án không tách rời sức khỏe và môi trường, mà tìm điểm cân bằng giữa **không khí sạch cho con người** và **giảm phát thải cho đô thị**.

## 36. Khả năng mở rộng trong tương lai

AirSafeNet có thể mở rộng theo các hướng:

- Tích hợp trạm quan trắc chính thống của thành phố.
- Tích hợp cảm biến IoT tại trường học/khu dân cư.
- Tích hợp dữ liệu giao thông thời gian thực.
- Hoàn thiện route planner A-B bằng API bản đồ chuyên dụng.
- Nâng cấp mô hình dự báo theo từng phường/xã.
- Thêm dashboard cho nhà trường/quận/phường.
- Thêm mobile app.
- Thêm cảnh báo qua Zalo/Telegram/email.
- Thêm báo cáo tuần/tháng cho gia đình và trường học.
- Thêm cơ chế cộng đồng báo cáo khu vực bụi, công trình, khói, kẹt xe.

## 37. Kết luận

AirSafeNet là nền tảng AI định hướng thực tiễn, kết hợp quản lý chất lượng không khí, cảnh báo sức khỏe, bản đồ khu vực, lập lịch hoạt động, tuyến đường sạch, Net Zero mobility, kinh tế tuần hoàn ở mức hành vi và dashboard đo lường tác động.

Điểm mạnh của dự án là không dừng ở việc “hiển thị AQI”, mà chuyển dữ liệu môi trường thành quyết định cụ thể cho từng người dùng: giờ nào nên ra ngoài, giờ nào nên tránh, có cần khẩu trang không, hoạt động trường học có nên tổ chức không, đi tuyến nào ít ô nhiễm hơn, phương tiện nào cân bằng giữa sức khỏe và phát thải.

Với hướng tiếp cận này, AirSafeNet phù hợp với yêu cầu của các cuộc thi về đổi mới sáng tạo, AI ứng dụng, quản lý chất lượng không khí, chuyển đổi xanh, giảm phát thải, Net Zero và phát triển đô thị bền vững.
## 38. Bảng đối chiếu chức năng với yêu cầu trọng tâm của Ban tổ chức

| Yêu cầu/định hướng | AirSafeNet đáp ứng bằng chức năng | Ý nghĩa thực tế |
|---|---|---|
| Quản lý chất lượng không khí | Dashboard AQI/PM2.5, forecast theo giờ, bản đồ nhiệt, dữ liệu nhiều nguồn, Trust Panel | Người dùng và nhà quản lý nhìn được tình hình không khí theo thời gian và khu vực |
| AI ứng dụng | Ensemble forecast, anomaly detection, XAI, AI Assistant, intent recognition, forecast accuracy | AI được dùng để dự báo, giải thích và đề xuất hành động, không chỉ trang trí giao diện |
| Sức khỏe cộng đồng | Health Profiles, Family Profiles, Dose Budget, cảnh báo nhóm nhạy cảm | Bảo vệ trẻ em, người già, người hen/suyễn, thai phụ, người đi xe máy |
| Chuyển đổi xanh | Clean Map, Commute Planner, Net Zero Mobility, Impact Dashboard | Hỗ trợ thay đổi hành vi di chuyển và sinh hoạt theo hướng xanh hơn |
| Giảm phát thải | So sánh CO2 theo phương tiện, gợi ý xe buýt/đi chung xe/xe đạp khi phù hợp | Giảm phát thải giao thông nhưng vẫn cân bằng với rủi ro phơi nhiễm PM2.5 |
| Kinh tế tuần hoàn | Green actions trong sự kiện trường học: bình nước cá nhân, hạn chế đồ dùng một lần, phân loại rác | Gắn kinh tế tuần hoàn vào hành vi nhỏ, dễ triển khai, không làm lệch trọng tâm dự án |
| Tác động đo được | Impact Dashboard: cảnh báo, phút phơi nhiễm giảm, dose budget giảm, CO2 avoided | Trả lời được câu hỏi dự án tạo ra tác động gì và đo bằng số liệu nào |
| Tính thực tế | Cảnh báo theo lịch đi học/đi làm/chạy bộ/sự kiện, bản đồ phường, tuyến đường sạch | Người dùng áp dụng được trong sinh hoạt hằng ngày |
| Minh bạch dữ liệu | Data Trust Card, source health, confidence, nhãn real-time/forecast/stale/fallback | Tăng niềm tin, tránh cảm giác AI đưa khuyến nghị không có căn cứ |
| Khả năng mở rộng | Kiến trúc 3 lớp, cache, API, có thể tích hợp trạm quan trắc, IoT, dữ liệu giao thông | Có thể triển khai thử nghiệm và mở rộng sau cuộc thi |

## 39. Bảng tổng hợp toàn bộ chức năng theo nhóm màn hình

| Nhóm màn hình/module | Chức năng chính | Người dùng hưởng lợi |
|---|---|---|
| Dashboard tổng quan | AQI, PM2.5, forecast, thời tiết, cảnh báo, briefing, trust, impact | Tất cả người dùng |
| Heatmap | Bản đồ nhiệt theo phường/xã, màu theo AQI/PM2.5, click xem chi tiết, chọn 2-3 khu vực so sánh | Người dân, trường học, nhà quản lý |
| Clean Map | Bản đồ sạch, tuyến đường ít ô nhiễm, clean corridor, so sánh tuyến | Người đi làm, học sinh, người đi xe máy |
| Activity Planner | Lịch hoạt động, tối ưu giờ, Golden Hour, Weekly Planner, Risk Matrix | Người tập thể thao, học sinh, người ra ngoài thường xuyên |
| What-if Simulator | Mô phỏng chạy bộ, đi học, đi làm, đá bóng theo thời lượng/khu vực/hồ sơ | Người dùng cá nhân, phụ huynh |
| Dose Budget | Tính phơi nhiễm PM2.5 theo thời gian, cường độ, vị trí, nhóm sức khỏe | Nhóm nhạy cảm, người tập thể thao |
| Family Profiles | Theo dõi trẻ em, người già, người bệnh hô hấp, thai phụ trong cùng tài khoản | Gia đình |
| Alert Inbox | Lưu lịch sử cảnh báo, trạng thái đã đọc, lý do, hành động khuyến nghị | Người dùng cần theo dõi quyết định đã nhận |
| Forecast Accuracy | So sánh forecast với thực tế, tính độ chính xác | Người dùng, ban giám khảo, nhà quản lý |
| School Green Safety | Quyết định thể dục, đá bóng, sự kiện ngoài trời, chuyển trong nhà, khẩu trang | Trường học, Đoàn/Hội |
| Net Zero Mobility | So sánh phương tiện theo CO2, exposure, thời gian, sức khỏe | Người đi làm, học sinh, đô thị xanh |
| Impact Dashboard | Đo cảnh báo, phút phơi nhiễm giảm, dose giảm, CO2 avoided, green actions | Ban tổ chức, nhà quản lý, nhóm dự án |
| AI Assistant | Hỏi đáp tự nhiên, Data Trust Card, nút hành động, fallback Gemini/OpenAI/local | Người dùng không chuyên kỹ thuật |
| Admin | Kiểm tra cache, compute forecast, heatmap, AI server, anomaly log | Nhóm vận hành |
| Guide | Giáo dục AQI/PM2.5, khẩu trang, mức màu, cách giảm phơi nhiễm | Cộng đồng |

## 40. Kịch bản demo đề xuất khi nộp hoặc thuyết trình

**Kịch bản 1 - Người dùng bình thường xem tình hình hôm nay:**

1. Mở Dashboard.
2. Xem AQI, PM2.5 hiện tại và forecast 24h.
3. Xem Daily Safety Briefing để biết giờ nên ra ngoài và giờ nên tránh.
4. Mở Trust Panel để thấy dữ liệu lấy từ đâu, cập nhật lúc nào, độ tin cậy bao nhiêu.
5. Kết luận: app không chỉ hiển thị chỉ số mà đưa ra khuyến nghị hành động.

**Kịch bản 2 - Phụ huynh hỏi về trẻ đi học:**

1. Mở AI Assistant.
2. Nhập câu hỏi: “Mai con em đi học lúc 7h có ổn không?”
3. Trợ lý trả lời theo School Green Safety Mode, Family Profiles và Dose Budget.
4. Quan sát Data Trust Card: nguồn dữ liệu, AQI/PM2.5, forecast, confidence.
5. Bấm “Tạo cảnh báo” hoặc “Tìm giờ sạch hơn”.
6. Kết luận: AI được nối với module thực tế, không trả lời chung chung.

**Kịch bản 3 - Người chạy bộ dùng What-if Simulator:**

1. Chọn hoạt động chạy bộ, thời lượng 60 phút, nhóm sức khỏe.
2. App tính rủi ro nếu chạy ngay.
3. App gợi ý 3 khung giờ tốt hơn.
4. App tính dose budget bị tiêu hao.
5. Kết luận: dự án cá nhân hóa theo hoạt động, thời lượng và sức khỏe.

**Kịch bản 4 - Trường học tổ chức sự kiện ngoài trời:**

1. Mở School Green Safety Mode hoặc School/Outdoor Event Mode.
2. Nhập tiết thể dục/sinh hoạt Đoàn/Hội/đá bóng.
3. App khuyến nghị tổ chức, đổi giờ, chuyển trong nhà hoặc chuẩn bị khẩu trang.
4. App thống kê số phút phơi nhiễm PM2.5 giảm nếu đổi giờ.
5. Ghi nhận green actions: bình nước cá nhân, hạn chế đồ dùng một lần, phân loại rác.
6. Kết luận: dự án bám sát trường học và chuyển đổi xanh.

**Kịch bản 5 - Người đi làm chọn tuyến đường và phương tiện:**

1. Mở Clean Map hoặc Commute Safety Planner.
2. Nhập điểm đi A, điểm đến B, giờ xuất phát, phương tiện.
3. App so sánh tuyến nhanh nhất, ít ô nhiễm nhất, cân bằng nhất.
4. App so sánh xe máy, xe buýt, xe đạp, đi bộ theo CO2 và PM2.5 exposure.
5. Kết luận: dự án kết hợp sức khỏe cá nhân và giảm phát thải đô thị.

**Kịch bản 6 - Đo tác động dự án:**

1. Mở Impact Dashboard.
2. Xem số cảnh báo đã gửi, số hoạt động được đổi giờ, phút phơi nhiễm giảm, dose budget giảm, CO2 avoided.
3. Xem nhóm hưởng lợi: trẻ em, người hen/suyễn, người cao tuổi, người đi xe máy.
4. Kết luận: dự án có chỉ số đo lường tác động rõ ràng.

## 41. Hiệu quả kỳ vọng

AirSafeNet kỳ vọng tạo hiệu quả ở ba cấp độ.

**Ở cấp độ cá nhân**, người dùng biết cách ra quyết định tốt hơn trong sinh hoạt hằng ngày: chọn giờ ra ngoài, đeo khẩu trang phù hợp, giảm thời lượng khi AQI cao, tránh hoạt động mạnh khi PM2.5 tăng, chọn tuyến đường và phương tiện cân bằng giữa sức khỏe và phát thải.

**Ở cấp độ gia đình và trường học**, phụ huynh, giáo viên và ban tổ chức hoạt động có công cụ hỗ trợ quyết định cho trẻ em và nhóm nhạy cảm. Việc dời tiết thể dục, chuyển sự kiện vào trong nhà hoặc chuẩn bị khẩu trang không còn dựa trên cảm tính mà dựa trên dữ liệu dự báo, rủi ro và dose budget.

**Ở cấp độ đô thị**, AirSafeNet có thể đóng góp dữ liệu và chỉ số cho quản lý chất lượng không khí, thúc đẩy hành vi xanh, giảm phát thải giao thông cá nhân và nâng cao nhận thức cộng đồng về PM2.5. Khi mở rộng thêm nguồn trạm quan trắc và dữ liệu giao thông, hệ thống có thể trở thành nền tảng hỗ trợ ra quyết định cho các khu vực đô thị đông dân.

## 42. Rủi ro triển khai và cách kiểm soát

| Rủi ro | Tác động | Cách kiểm soát trong AirSafeNet |
|---|---|---|
| API dữ liệu ngoài bị lỗi | Dashboard thiếu dữ liệu mới | Dùng cache/fallback, gắn nhãn stale/fallback thay vì ẩn dữ liệu |
| Dữ liệu quan trắc chưa đủ dày | Dự báo theo phường/xã có sai số | Hiển thị confidence, cho phép tích hợp trạm chính thống/IoT sau |
| Người dùng hiểu sai khuyến nghị AI | Có thể ra quyết định không phù hợp | Data Trust Card, cảnh báo rõ đây là hỗ trợ tham khảo, ưu tiên hành động an toàn |
| AI provider lỗi | Trợ lý ảo không trả lời | Fallback Gemini -> OpenAI -> local rule-based answer |
| Gợi ý xanh nhưng AQI cao | Người dùng chọn xe đạp/đi bộ trong điều kiện xấu | Net Zero Mobility luôn cân bằng CO2 với PM2.5 exposure và hồ sơ sức khỏe |
| Cảnh báo quá nhiều | Người dùng bỏ qua cảnh báo | Cảnh báo theo ngữ cảnh, có cooldown, ưu tiên mức độ và hành động cụ thể |
| Dữ liệu bản đồ chưa hoàn chỉnh | Một số khu vực chưa chính xác | Gắn nguồn dữ liệu, cho phép cập nhật shapefile/GeoJSON chính thống sau |

## 43. Kết quả sản phẩm hiện có

AirSafeNet hiện có các thành phần sản phẩm chính:

- Web dashboard React/TypeScript.
- Backend ASP.NET Core với JWT, activity, preferences, family profile, assistant, alert, data source health.
- AI server FastAPI phục vụ forecast/cache/anomaly.
- Dashboard AQI/PM2.5 và forecast.
- Activity Planner và Dose Budget.
- Health Profiles và Family Profiles.
- Daily Safety Briefing.
- What-if Activity Simulator.
- Commute Safety Planner.
- Alert Inbox.
- Forecast Accuracy Score.
- Trust & Explainability Panel.
- Heatmap và Clean Map.
- School Green Safety Mode.
- School/Outdoor Event Mode.
- Net Zero Mobility Panel.
- Impact Dashboard.
- AI Assistant có Data Trust Card, intent actions và fallback.
- Admin page phục vụ vận hành/demo.

## 44. Cam kết định hướng phát triển

Nhóm phát triển AirSafeNet định hướng tiếp tục hoàn thiện dự án theo hướng thực tế, có thể triển khai thử nghiệm tại trường học hoặc khu dân cư. Trọng tâm tiếp theo là tăng chất lượng dữ liệu địa lý, tích hợp thêm nguồn quan trắc chính thống, cải thiện clean route A-B, bổ sung dữ liệu giao thông, hoàn thiện báo cáo tác động định kỳ và tối ưu trải nghiệm mobile.

Dự án được thiết kế để mở rộng chứ không chỉ phục vụ demo. Các module đều xoay quanh một mục tiêu chung: giúp người dân và tổ chức ra quyết định tốt hơn trước ô nhiễm không khí, đồng thời thúc đẩy hành vi xanh, giảm phát thải và bảo vệ sức khỏe cộng đồng.