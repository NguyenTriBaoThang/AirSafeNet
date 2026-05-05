---
id: database
title: Database
sidebar_label: Database
---

# Database Schema

## Tables

### Users
```sql
Id, FullName, Email, PasswordHash, Role (User|Admin), CreatedAt
```

### UserPreferences
```sql
UserId, UserGroup, PreferredLocation,
NotifyEnabled, NotifyChannel (telegram|email|both),
TelegramChatId, NotifyEmail, NotifyThreshold (0-500),
LastAlertSentAt, UpdatedAt
```

### UserActivitySchedules
```sql
UserId, Name, Icon, HourOfDay, Minute, DurationMinutes,
IsOutdoor, Intensity (low|moderate|high),
DaysOfWeek (comma-separated 1-7), IsActive, CreatedAt
```

### ChatConversations
```sql
Id, UserId, Title, IsPinned, HasUnread,
MessageCount, LastMessageAt, CreatedAt
```

### ChatMessages
```sql
Id, ConversationId, Role (user|assistant),
Content, UserGroup, CurrentAqi, CurrentPm25,
SourceUserMessageId, RegeneratedCount, CreatedAt
```

### AlertLogs
```sql
Id, UserId, Aqi, Pm25, Risk, Message,
Channel, SentToEmail, SentToTelegramChatId,
IsRead, Success, CreatedAt
```
