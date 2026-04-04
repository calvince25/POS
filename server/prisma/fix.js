const fs = require('fs');
let schema = fs.readFileSync('schema.prisma', 'utf8');

// Replace provider
schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

// Replace enums blocks
schema = schema.replace(/enum \w+ \{[\s\S]*?\}/g, '');

// Replace enum usages in models
schema = schema.replace(/status\s+UserStatus\s+@default\(ACTIVE\)/g, 'status String @default("ACTIVE")');
schema = schema.replace(/status\s+TableStatus\s+@default\(AVAILABLE\)/g, 'status String @default("AVAILABLE")');
schema = schema.replace(/status\s+OrderStatus\s+@default\(PENDING\)/g, 'status String @default("PENDING")');
schema = schema.replace(/method\s+PaymentMethod/g, 'method String');
schema = schema.replace(/status\s+PaymentStatus\s+@default\(PENDING\)/g, 'status String @default("PENDING")');
schema = schema.replace(/status\s+RoomStatus\s+@default\(AVAILABLE\)/g, 'status String @default("AVAILABLE")');
schema = schema.replace(/status\s+BookingStatus\s+@default\(CONFIRMED\)/g, 'status String @default("CONFIRMED")');

fs.writeFileSync('schema.prisma', schema);
console.log('Schema fixed');
