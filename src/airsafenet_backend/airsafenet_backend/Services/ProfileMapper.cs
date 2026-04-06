namespace airsafenet_backend.Services
{
    public static class ProfileMapper
    {
        public static string ToAiProfile(string? userGroup)
        {
            var value = (userGroup ?? "normal").Trim().ToLower();

            return value switch
            {
                "child" => "children",
                "elderly" => "elderly",
                "respiratory" => "respiratory",
                "pregnant" => "children",
                "normal" => "general",
                _ => "general"
            };
        }
    }
}
