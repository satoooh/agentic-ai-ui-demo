import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "multipart/form-data が必要です。",
      },
      { status: 400 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Invalid request", message: "file フィールドが必要です。" },
      { status: 400 },
    );
  }

  return NextResponse.json({
    filename: file.name,
    transcription: "",
    note: "STTプロバイダ未接続のため、サーバー側文字起こしは未実行です。",
  });
}
