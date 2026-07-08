namespace airsafenet_backend.Services
{
    public static class ProfileMapper
    {
        public static string ToAiProfile(string? userGroup) =>
            UserProfileRuleService.ToAiProfile(userGroup);
    }
}