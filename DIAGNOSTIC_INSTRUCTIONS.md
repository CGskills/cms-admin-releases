# DIAGNOSTIC INSTRUCTIONS FOR SPACE KEY ISSUE

## TEMPORARY CHANGES MADE

Added diagnostic logging to:
- `app/admin/pricing/_components/SupabasePricingEditor.tsx`
- `app/admin/pricing/_components/DIAGNOSTIC_LOG.tsx` (new file)

## HOW TO TEST

### 1. Build the application
```bash
npm run build
npm run desktop:prepare
```

### 2. Test in Browser (localhost:3000)
```bash
npm run dev
```
- Open browser console (F12)
- Navigate to `/admin/pricing`
- Click in the search input field at the top
- Press Space key
- Copy all console logs that start with `[CAPTURE]`, `[BUBBLE]`, `[GLOBAL]`, `[FilteredKeyboardSensor]`

### 3. Test in Electron .exe
- Run the packaged .exe application
- Open DevTools (if enabled) or check electron console
- Navigate to `/admin/pricing`
- Click in the search input field at the top
- Press Space key
- Copy all console logs

## WHAT TO LOOK FOR

### Expected logs for each Space keypress:

1. **Global capture phase:**
   - `[GLOBAL CAPTURE] keydown Space`
   - Check: `defaultPrevented` should be `false` initially

2. **React component capture:**
   - `[CAPTURE] keydown`
   - Check: `event.target.tagName` should be `INPUT`

3. **FilteredKeyboardSensor:**
   - `[FilteredKeyboardSensor] Space key detected`
   - Check: `will filter?` should be `true` for INPUT
   - Should see: `[FilteredKeyboardSensor] Filtered out - returning false`

4. **React component bubble:**
   - `[BUBBLE] keydown`
   - Check: `defaultPrevented` status

5. **Global bubble:**
   - `[GLOBAL BUBBLE] keydown Space`
   - Check: `defaultPrevented` - if `true`, something called preventDefault

6. **Keyup events:**
   - `[GLOBAL] keyup Space`

## KEY COMPARISONS

Compare between Browser and Electron:

1. **event.target.tagName** - should be INPUT in both
2. **defaultPrevented** - when does it become true?
3. **document.activeElement.tagName** - should be INPUT in both
4. **FilteredKeyboardSensor logs** - does it filter correctly?
5. **Order of events** - is the sequence the same?

## ANALYSIS QUESTIONS

1. Does FilteredKeyboardSensor get called in Electron?
2. Does it correctly identify INPUT tag?
3. Does it return false?
4. Who calls preventDefault? (check defaultPrevented progression)
5. Are there any extra events or handlers in Electron?

## CLEANUP AFTER TESTING

Run this command to remove diagnostic code:
```bash
rm app/admin/pricing/_components/DIAGNOSTIC_LOG.tsx
# Then manually remove:
# - Import of logKeyEvent and installGlobalDiagnostics
# - installGlobalDiagnostics() call
# - All onKeyDownCapture/onKeyUpCapture handlers on search input
# - Console.log statements in FilteredKeyboardSensor
```
