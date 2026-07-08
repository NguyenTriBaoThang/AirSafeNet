export type UserProfileRule = {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  aiProfile: string;
  recommendedNotifyThreshold: number;
  sensitivityMultiplier: number;
  maskRule: string;
  outdoorRule: string;
  alertRule: string;
  activityAdvice: string;
  maxOutdoorGoodMinutes: number;
  maxOutdoorModerateMinutes: number;
  maxOutdoorSensitiveMinutes: number;
  maxOutdoorUnhealthyMinutes: number;
  maxOutdoorVeryUnhealthyMinutes: number;
  keyActions: string[];
};

export const USER_PROFILE_RULES: UserProfileRule[] = [
  {
    id: "normal",
    label: "Người dùng phổ thông",
    shortLabel: "Phổ thông",
    description: "Người trưởng thành khỏe mạnh, sinh hoạt ngoài trời mức vừa.",
    aiProfile: "general",
    recommendedNotifyThreshold: 100,
    sensitivityMultiplier: 1,
    maskRule: "KF94 khi AQI >= 100; N95/KN95 khi AQI >= 150 hoặc phải ở ngoài trời lâu.",
    outdoorRule: "Có thể sinh hoạt bình thường khi AQI tốt; giảm thời gian ngoài trời khi AQI vượt 100.",
    alertRule: "Cảnh báo từ AQI 100, nhấn mạnh giờ AQI thấp hơn nếu có hoạt động ngoài trời.",
    activityAdvice: "Ưu tiên khung giờ AQI thấp và tránh vận động mạnh khi không khí xấu.",
    maxOutdoorGoodMinutes: 120,
    maxOutdoorModerateMinutes: 90,
    maxOutdoorSensitiveMinutes: 45,
    maxOutdoorUnhealthyMinutes: 30,
    maxOutdoorVeryUnhealthyMinutes: 15,
    keyActions: ["Đổi giờ nếu AQI > 150", "Đeo KF94/N95 khi đi đường lâu", "Giữ vận động mạnh dưới 30 phút khi AQI > 100"],
  },
  {
    id: "child_school",
    label: "Trẻ em đi học",
    shortLabel: "Trẻ đi học",
    description: "Trẻ có giờ đi học, ra chơi, thể dục hoặc đi qua đường đông xe.",
    aiProfile: "children",
    recommendedNotifyThreshold: 75,
    sensitivityMultiplier: 1.45,
    maskRule: "KF94/N95 khi đi học nếu AQI >= 75; N95 khi AQI >= 120 hoặc đường đông xe.",
    outdoorRule: "Giảm ra chơi/thể dục ngoài trời khi AQI > 75; chuyển vào trong nhà khi AQI > 120.",
    alertRule: "Cảnh báo sớm trước giờ đi học, giờ ra chơi và hoạt động thể thao của trẻ.",
    activityAdvice: "Đi thẳng vào lớp, tránh đứng lâu ngoài cổng trường và giảm vận động ngoài trời.",
    maxOutdoorGoodMinutes: 90,
    maxOutdoorModerateMinutes: 45,
    maxOutdoorSensitiveMinutes: 25,
    maxOutdoorUnhealthyMinutes: 15,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Dời thể dục/đá bóng", "Giảm ra chơi còn 15-20 phút", "Mang KF94/N95"],
  },
  {
    id: "elderly",
    label: "Người cao tuổi",
    shortLabel: "Cao tuổi",
    description: "Người lớn tuổi, dễ bị ảnh hưởng tim mạch/hô hấp khi ô nhiễm tăng.",
    aiProfile: "elderly",
    recommendedNotifyThreshold: 80,
    sensitivityMultiplier: 1.35,
    maskRule: "KF94/N95 khi AQI >= 80; N95/KN95 khi AQI >= 120 nếu phải đi bộ/đi chợ.",
    outdoorRule: "Ưu tiên đi bộ nhẹ ở giờ AQI thấp; tránh đứng ngoài trời lâu khi AQI > 100.",
    alertRule: "Cảnh báo trước giờ đi bộ, đi chợ, khám bệnh hoặc lịch ra ngoài.",
    activityAdvice: "Đi chậm, nghỉ giữa chặng và vào trong nhà ngay nếu chóng mặt, tức ngực hoặc khó thở.",
    maxOutdoorGoodMinutes: 60,
    maxOutdoorModerateMinutes: 40,
    maxOutdoorSensitiveMinutes: 25,
    maxOutdoorUnhealthyMinutes: 15,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Dời đi bộ/đi chợ", "Đeo KF94/N95", "Đi dưới 20-30 phút khi AQI cao"],
  },
  {
    id: "asthma",
    label: "Người có hen/suyễn",
    shortLabel: "Hen/suyễn",
    description: "Người có hen, suyễn hoặc bệnh hô hấp dễ kích phát bởi PM2.5.",
    aiProfile: "respiratory",
    recommendedNotifyThreshold: 50,
    sensitivityMultiplier: 1.6,
    maskRule: "N95/KN95 khi AQI >= 50; tránh khẩu trang lỏng khi PM2.5 tăng nhanh.",
    outdoorRule: "Hạn chế ngoài trời từ AQI 50; tránh ra ngoài khi AQI > 100 nếu không cần thiết.",
    alertRule: "Cảnh báo rất sớm khi PM2.5 tăng, AQI trung bình hoặc có lịch ra ngoài.",
    activityAdvice: "Mang thuốc theo chỉ định, theo dõi triệu chứng và dừng hoạt động khi khò khè/khó thở.",
    maxOutdoorGoodMinutes: 45,
    maxOutdoorModerateMinutes: 25,
    maxOutdoorSensitiveMinutes: 15,
    maxOutdoorUnhealthyMinutes: 0,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Ở trong nhà khi PM2.5 spike", "Đeo N95/KN95", "Mang thuốc theo chỉ định"],
  },
  {
    id: "outdoor_athlete",
    label: "Người tập thể thao ngoài trời",
    shortLabel: "Thể thao ngoài trời",
    description: "Người chạy bộ, đá bóng, đạp xe hoặc tập cường độ cao ngoài trời.",
    aiProfile: "general",
    recommendedNotifyThreshold: 100,
    sensitivityMultiplier: 1.25,
    maskRule: "N95/KF94 khi di chuyển; không tập nặng ở mức AQI buộc phải đeo khẩu trang lọc tốt.",
    outdoorRule: "Chỉ tập nặng khi AQI tốt/trung bình thấp; giảm cường độ hoặc dời giờ khi AQI > 100.",
    alertRule: "Cảnh báo trước khung tập, gợi ý đổi giờ và giới hạn thời lượng theo cường độ.",
    activityAdvice: "Dời buổi tập sang giờ AQI thấp, giữ cường độ nhẹ hoặc chuyển vào trong nhà.",
    maxOutdoorGoodMinutes: 90,
    maxOutdoorModerateMinutes: 60,
    maxOutdoorSensitiveMinutes: 30,
    maxOutdoorUnhealthyMinutes: 15,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Dời chạy bộ/đá bóng", "Giảm còn 30 phút", "Chuyển indoor khi AQI > 150"],
  },
  {
    id: "motorbike_commuter",
    label: "Người đi làm bằng xe máy",
    shortLabel: "Đi xe máy",
    description: "Người đi học/đi làm bằng xe máy, phơi nhiễm trực tiếp với bụi đường và khí thải.",
    aiProfile: "general",
    recommendedNotifyThreshold: 90,
    sensitivityMultiplier: 1.3,
    maskRule: "N95/KN95 ôm kín khi AQI >= 90; thay khẩu trang nếu ẩm/bẩn sau khi đi đường dài.",
    outdoorRule: "Giảm thời gian trên đường, chọn tuyến ít kẹt xe và tránh đứng lâu sau xe tải/xe buýt.",
    alertRule: "Cảnh báo trước giờ commute, gợi ý dời giờ hoặc chọn tuyến ít rủi ro hơn.",
    activityAdvice: "Đi sớm/muộn hơn giờ cao điểm, tránh tuyến đông xe và rửa mặt sau khi đến nơi.",
    maxOutdoorGoodMinutes: 90,
    maxOutdoorModerateMinutes: 60,
    maxOutdoorSensitiveMinutes: 30,
    maxOutdoorUnhealthyMinutes: 20,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Đeo N95/KN95 khi chạy xe", "Dời giờ nếu PM2.5 spike", "Giữ commute dưới 20-30 phút"],
  },
  {
    id: "pregnant",
    label: "Phụ nữ mang thai",
    shortLabel: "Thai phụ",
    description: "Thai phụ cần giảm phơi nhiễm tích lũy và tránh hoạt động ngoài trời khi AQI tăng.",
    aiProfile: "children",
    recommendedNotifyThreshold: 75,
    sensitivityMultiplier: 1.4,
    maskRule: "KF94/N95 khi AQI >= 75; N95/KN95 khi AQI >= 120 nếu bắt buộc ra ngoài.",
    outdoorRule: "Ưu tiên trong nhà; tránh đứng ngoài trời lâu và tránh đường đông xe.",
    alertRule: "Cảnh báo sớm khi AQI vượt trung bình, PM2.5 spike hoặc có lịch di chuyển.",
    activityAdvice: "Dời lịch ra ngoài sang giờ AQI thấp, đi ngắn và nghỉ ngay nếu mệt/khó thở.",
    maxOutdoorGoodMinutes: 60,
    maxOutdoorModerateMinutes: 35,
    maxOutdoorSensitiveMinutes: 20,
    maxOutdoorUnhealthyMinutes: 10,
    maxOutdoorVeryUnhealthyMinutes: 0,
    keyActions: ["Dời lịch ra ngoài", "Đeo KF94/N95", "Giữ ngoài trời dưới 20 phút khi AQI > 100"],
  },
];

const PROFILE_ALIASES: Record<string, string> = {
  child: "child_school",
  children: "child_school",
  student: "child_school",
  school_child: "child_school",
  child_school: "child_school",
  elderly: "elderly",
  respiratory: "asthma",
  asthma: "asthma",
  hen: "asthma",
  suyen: "asthma",
  outdoor_athlete: "outdoor_athlete",
  athlete: "outdoor_athlete",
  runner: "outdoor_athlete",
  motorbike_commuter: "motorbike_commuter",
  commuter: "motorbike_commuter",
  motorbike: "motorbike_commuter",
  pregnant: "pregnant",
  normal: "normal",
  general: "normal",
};

export function normalizeUserProfileId(value?: string | null): string {
  const normalized = (value ?? "normal").trim().toLowerCase();
  return PROFILE_ALIASES[normalized] ?? "normal";
}

export function getUserProfileRule(
  value?: string | null,
  rules: UserProfileRule[] = USER_PROFILE_RULES,
): UserProfileRule {
  const id = normalizeUserProfileId(value);
  return rules.find((rule) => rule.id === id) ?? USER_PROFILE_RULES[0];
}