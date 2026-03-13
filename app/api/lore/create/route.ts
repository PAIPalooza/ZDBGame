import { NextResponse } from 'next/server';
import { saveLore } from '@/lib/data';

export async function POST(request: Request) {
  try {
    const { title, content, region, tags } = await request.json();

    if (!title || !content || !region) {
      return NextResponse.json(
        { error: 'title, content, and region are required' },
        { status: 400 }
      );
    }

    const lore = saveLore({
      title,
      content,
      region,
      tags: tags || []
    });

    return NextResponse.json(lore, { status: 201 });
  } catch (error) {
    console.error('Failed to create lore:', error);
    return NextResponse.json(
      { error: 'Failed to create lore' },
      { status: 500 }
    );
  }
}
