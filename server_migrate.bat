@echo off
set "DATABASE_URL=postgresql://postgres.axfipopovsnjoyizwpkd:Calvince001ABC%%2C.@aws-1-eu-north-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=30"
set "DIRECT_URL=postgresql://postgres.axfipopovsnjoyizwpkd:Calvince001ABC%%2C.@aws-1-eu-north-1.pooler.supabase.com:5432/postgres?connect_timeout=30"
npx prisma db push --schema=server/prisma/schema.prisma --accept-data-loss
