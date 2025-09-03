import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { existsSync } from 'fs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: '没有找到图片文件' },
        { status: 400 }
      );
    }

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的图片格式，请上传 JPG、PNG、GIF 或 WebP 格式的图片' },
        { status: 400 }
      );
    }

    // 验证文件大小 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '图片大小不能超过 5MB' },
        { status: 400 }
      );
    }

    // 生成 UUID 文件名
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${uuidv4()}.${fileExtension}`;

    // 确保目录存在
    const uploadDir = join(process.cwd(), 'public', 'meme-token-logos');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 保存文件
    const filePath = join(uploadDir, fileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    // 返回文件路径
    const imageUrl = `/meme-token-logos/${fileName}`;

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        imageUrl,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    console.error('图片上传失败:', error);
    return NextResponse.json(
      { success: false, error: '图片上传失败，请重试' },
      { status: 500 }
    );
  }
}