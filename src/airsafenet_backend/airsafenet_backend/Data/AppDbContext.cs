using airsafenet_backend.Models;
using Microsoft.EntityFrameworkCore;

namespace airsafenet_backend.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        { 
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();
        public DbSet<AirQualityLog> AirQualityLogs => Set<AirQualityLog>();
        public DbSet<AlertLog> AlertLogs => Set<AlertLog>();
        public DbSet<ChatConversation> ChatConversations => Set<ChatConversation>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<User>()
                .HasIndex(x => x.Email)
                .IsUnique();

            modelBuilder.Entity<User>()
                .HasOne(x => x.Preferences)
                .WithOne(x => x.User)
                .HasForeignKey<UserPreferences>(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatConversation>()
                .HasOne(x => x.User)
                .WithMany()
                .HasForeignKey(x => x.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(x => x.Conversation)
                .WithMany(x => x.Messages)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        }
    }
}
