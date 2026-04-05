@echo off
set DATABASE_URL=postgresql://postgres.axfipopovsnjoyizwpkd:Calvince001ABC%%2C.@aws-0-us-east-1.pooler.supabase.com:5432/postgres
set DIRECT_URL=postgresql://postgres.axfipopovsnjoyizwpkd:Calvince001ABC%%2C.@aws-0-us-east-1.pooler.supabase.com:5432/postgres
node node_modules\prisma\build\index.js db push --schema=server\prisma\schema.prisma
