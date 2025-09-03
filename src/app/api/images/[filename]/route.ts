import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params;

    // 验证文件名格式（防止路径遍历攻击）
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: '无效的文件名' },
        { status: 400 }
      );
    }

    // 构建文件路径
    const filePath = join(process.cwd(), 'public', 'meme-token-logos', filename);

    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: '文件不存在' },
        { status: 404 }
      );
    }

    // 读取文件
    const fileBuffer = await readFile(filePath);

    // 根据文件扩展名设置 Content-Type
    const extension = filename.split('.').pop()?.toLowerCase();
    let contentType = 'application/octet-stream';

    switch (extension) {
      case 'jpg':
      case 'jpeg':
        contentType = 'image/jpeg';
        break;
      case 'png':
        contentType = 'image/png';
        break;
      case 'gif':
        contentType = 'image/gif';
        break;
      case 'webp':
        contentType = 'image/webp';
        break;
      case 'svg':
        contentType = 'image/svg+xml';
        break;
    }

    // 返回图片文件
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 缓存一年
        'Content-Length': fileBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('获取图片失败:', error);
    return NextResponse.json(
      { success: false, error: '获取图片失败' },
      { status: 500 }
    );
  }
}