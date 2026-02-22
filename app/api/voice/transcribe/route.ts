import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json(
      {
        mode: "mock",
        transcription:
          "本日は2階東側で配筋を実施。午後に型枠補修を行い、明日は配管スリーブ確認予定。",
        note: "multipart/form-data 未指定のためテキストモックを返しています。",
      },
      { status: 200 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  return NextResponse.json({
    mode: "mock",
    filename: file instanceof File ? file.name : "unknown",
    transcription:
      "録音モックを受信しました。SpeechInput実装時に外部STTへ接続してこの値を置き換えてください。",
  });
}
