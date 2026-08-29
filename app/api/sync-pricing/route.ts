import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAdminApi } from '@/lib/auth/api';
import { isPlainRecord } from '@/lib/validation/input';

interface Row {
  name: string;
  price: string;
  duration?: string;
}

interface Slide {
  rows: Row[];
  subtitleTitle?: string;
  subtitle?: string;
}

interface Subsection {
  name: string;
  slides: Slide[];
}

interface Section {
  title: string;
  sortOrder: number;
  subsections: Subsection[];
}

type TableData = Record<string, Section>;

const MAX_TEXT_LENGTH = 2_000;

function boundedText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | null {
  return typeof value === 'string' && value.length <= maxLength ? value : null;
}

export async function POST(request: Request) {
  const denied = await requireAdminApi(request);
  if (denied) return denied;
  const supabase = await createClient();

  let tableData: TableData;
  try {
    tableData = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!isPlainRecord(tableData) || Object.keys(tableData).length > 100) {
    return NextResponse.json({ error: 'Expected object' }, { status: 400 });
  }

  // Convert Firebase structure to flat Supabase rows
  const rows: Record<string, unknown>[] = [];
  let orderIndex = 0;

  const sections = Object.entries(tableData).map(([key, value]) => ({ key, value }));
  for (const { value } of sections) {
    if (!isPlainRecord(value)) {
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
    }
    if (value.sortOrder !== undefined &&
        (typeof value.sortOrder !== 'number' || !Number.isFinite(value.sortOrder))) {
      return NextResponse.json({ error: 'Invalid section order' }, { status: 400 });
    }
  }

  const sortedSections = sections
    .sort((a, b) => Number(a.value.sortOrder ?? 0) - Number(b.value.sortOrder ?? 0))
    .map(({ key }) => key);

  for (const secKey of sortedSections) {
    const sec = tableData[secKey];
    const categoryValue = sec.title;
    const category = categoryValue === undefined ? 'Без категории' : boundedText(categoryValue);
    if (category === null) {
      return NextResponse.json({ error: 'Invalid section title' }, { status: 400 });
    }

    if (sec.subsections !== undefined && !Array.isArray(sec.subsections)) {
      return NextResponse.json({ error: 'Invalid subsections' }, { status: 400 });
    }

    for (const sub of (sec.subsections as unknown[] | undefined) || []) {
      if (!isPlainRecord(sub)) return NextResponse.json({ error: 'Invalid subsection' }, { status: 400 });
      const descriptionValue = sub.name;
      const description = descriptionValue === undefined ? 'Общее' : boundedText(descriptionValue);
      if (description === null) {
        return NextResponse.json({ error: 'Invalid subsection name' }, { status: 400 });
      }
      if (sub.slides !== undefined && !Array.isArray(sub.slides)) {
        return NextResponse.json({ error: 'Invalid slides' }, { status: 400 });
      }

      for (let slideIdx = 0; slideIdx < ((sub.slides as unknown[] | undefined) || []).length; slideIdx++) {
        const slide = (sub.slides as unknown[])[slideIdx];
        if (!isPlainRecord(slide)) return NextResponse.json({ error: 'Invalid slide' }, { status: 400 });
        if (slide.rows !== undefined && !Array.isArray(slide.rows)) {
          return NextResponse.json({ error: 'Invalid pricing rows' }, { status: 400 });
        }

        for (const row of (slide.rows as unknown[] | undefined) || []) {
          if (!isPlainRecord(row)) return NextResponse.json({ error: 'Invalid pricing row' }, { status: 400 });
          const rowName = row.name;
          const rowPrice = row.price;
          if (!rowName && !rowPrice) continue;
          if (typeof rowName !== 'string' || typeof rowPrice !== 'string' || rowName.length > 500 || rowPrice.length > 120) {
            return NextResponse.json({ error: 'Invalid pricing row' }, { status: 400 });
          }

          const duration = row.duration === undefined ? '' : boundedText(row.duration, 120);
          if (duration === null) return NextResponse.json({ error: 'Invalid pricing duration' }, { status: 400 });

          const features: Record<string, unknown> = { slideIndex: slideIdx };
          if (slide.subtitleTitle !== undefined) {
            const subtitleTitle = boundedText(slide.subtitleTitle);
            if (subtitleTitle === null) return NextResponse.json({ error: 'Invalid subtitle title' }, { status: 400 });
            if (subtitleTitle) features.subtitleTitle = subtitleTitle;
          }
          if (slide.subtitle !== undefined) {
            const subtitle = boundedText(slide.subtitle);
            if (subtitle === null) return NextResponse.json({ error: 'Invalid subtitle' }, { status: 400 });
            if (subtitle) features.subtitle = subtitle;
          }

          rows.push({
            category,
            name: rowName || '',
            description,
            price: rowPrice || '',
            duration,
            features: [JSON.stringify(features)],
            order_index: orderIndex++,
            visible: true,
          });
        }
      }
    }
  }
  if (rows.length > 10_000) return NextResponse.json({ error: 'Too many pricing rows' }, { status: 400 });

  const { data: synced, error: syncError } = await supabase.rpc('replace_pricing_atomic', { payload: rows });
  if (syncError) return NextResponse.json({ error: `Atomic sync failed: ${syncError.message}` }, { status: 500 });

  return NextResponse.json({
    success: true,
    synced: typeof synced === 'number' ? synced : rows.length,
    sections: sortedSections.length,
  });
}
