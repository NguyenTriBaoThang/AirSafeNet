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
        }
    }
}
