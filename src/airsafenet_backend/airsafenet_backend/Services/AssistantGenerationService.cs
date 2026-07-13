namespace airsafenet_backend.Services
{
    public class AssistantGenerationResult
    {
        public string Answer { get; set; } = string.Empty;
        public string Provider { get; set; } = "local-rules";
        public string FallbackLevel { get; set; } = "local";
    }

    public class AssistantGenerationService
    {
        private readonly GeminiChatService _geminiChatService;
        private readonly OpenAiChatService _openAiChatService;
        private readonly ILogger<AssistantGenerationService> _logger;

        public AssistantGenerationService(
            GeminiChatService geminiChatService,
            OpenAiChatService openAiChatService,
            ILogger<AssistantGenerationService> logger)
        {
            _geminiChatService = geminiChatService;
            _openAiChatService = openAiChatService;
            _logger = logger;
        }

        public async Task<AssistantGenerationResult> GenerateAsync(
            string systemPrompt,
            string userPrompt,
            string localFallbackAnswer)
        {
            try
            {
                var answer = await _geminiChatService.GenerateAssistantAnswerAsync(systemPrompt, userPrompt);
                return new AssistantGenerationResult
                {
                    Answer = answer,
                    Provider = "Gemini",
                    FallbackLevel = "primary"
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Gemini assistant generation failed; falling back to OpenAI.");
            }

            try
            {
                var answer = await _openAiChatService.GenerateAssistantAnswerAsync(systemPrompt, userPrompt);
                return new AssistantGenerationResult
                {
                    Answer = answer,
                    Provider = "OpenAI",
                    FallbackLevel = "fallback-openai"
                };
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "OpenAI assistant fallback failed; using local rule-based answer.");
            }

            return new AssistantGenerationResult
            {
                Answer = localFallbackAnswer,
                Provider = "Local rules",
                FallbackLevel = "fallback-local"
            };
        }
    }
}