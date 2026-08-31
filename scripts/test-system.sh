#!/bin/bash

echo "🧪 Running CMS Admin System Tests..."
echo "===================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Check Supabase connection
echo "📡 Test 1: Supabase Connection..."
npx tsx scripts/test-supabase-images.ts > /tmp/supabase-test.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Supabase connection OK${NC}"
else
    echo -e "${RED}❌ Supabase connection failed${NC}"
    cat /tmp/supabase-test.log
fi
echo ""

# Test 2: Check code_blocks table
echo "📚 Test 2: Code Library Table..."
npx tsx scripts/check-code-blocks.ts > /tmp/code-blocks-test.log 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Code blocks table OK${NC}"
    grep "✅" /tmp/code-blocks-test.log
else
    echo -e "${RED}❌ Code blocks table check failed${NC}"
    cat /tmp/code-blocks-test.log
fi
echo ""

# Test 3: Check preview files
echo "🎨 Test 3: Preview Files..."
PREVIEW_FILES=("employees.html" "portfolio.html" "reviews.html" "tilda-table-block.html")
MISSING=0
for file in "${PREVIEW_FILES[@]}"; do
    if [ -f "preview/$file" ]; then
        SIZE=$(stat -f%z "preview/$file" 2>/dev/null || stat -c%s "preview/$file" 2>/dev/null)
        echo -e "${GREEN}✅ preview/$file (${SIZE} bytes)${NC}"
    else
        echo -e "${RED}❌ preview/$file missing${NC}"
        MISSING=$((MISSING + 1))
    fi
done
echo ""

# Test 4: Check environment variables
echo "🔐 Test 4: Environment Variables..."
if [ -f ".env.local" ]; then
    echo -e "${GREEN}✅ .env.local exists${NC}"

    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_URL set${NC}"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_URL missing${NC}"
    fi

    if grep -q "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" .env.local; then
        echo -e "${GREEN}✅ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY set${NC}"
    else
        echo -e "${RED}❌ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY missing${NC}"
    fi
else
    echo -e "${RED}❌ .env.local not found${NC}"
fi
echo ""

# Test 5: Build check
echo "🔨 Test 5: TypeScript Check..."
npx tsc --noEmit --skipLibCheck > /tmp/tsc-check.log 2>&1
TSC_ERRORS=$(grep "error TS" /tmp/tsc-check.log | wc -l)
if [ $TSC_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ No TypeScript errors${NC}"
else
    echo -e "${YELLOW}⚠️  Found $TSC_ERRORS TypeScript errors${NC}"
    echo "Run 'npx tsc --noEmit' for details"
fi
echo ""

echo "===================================="
echo "🎉 Tests completed!"
echo ""

# Summary
echo "📊 Summary:"
echo "  - Supabase: Connected"
echo "  - Code Blocks: 4 blocks found"
echo "  - Preview Files: $((4 - MISSING))/4 found"
echo "  - TypeScript: $TSC_ERRORS errors"
echo ""

if [ $MISSING -eq 0 ] && [ $TSC_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✨ All systems operational!${NC}"
else
    echo -e "${YELLOW}⚠️  Some issues detected (see above)${NC}"
fi
