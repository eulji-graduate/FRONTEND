/**
 * 비대면 회의 녹음 파일의 **1차 클라이언트 검증** — BE가 받는 형식·용량 제한을 그대로
 * 화면에서도 미리 막는다(백엔드 담당자 확인, 2026-08-14). 서버(Server Action)가 최종
 * 검증한다(§권한: 화면 검증은 UX일 뿐 보안이 아니다) — 여기는 사용자가 잘못된 파일을
 * 골랐을 때 업로드를 기다리지 않고 바로 알려주는 자리일 뿐이다.
 */

export const RECORDING_FILE_ACCEPTED_EXTENSIONS: readonly string[] = [
  "wav",
  "mp3",
  "mp4",
  "m4a",
  "flac",
  "ogg",
  "webm",
  "amr",
];

/** 5GiB(2^30 바이트 기준) — 파일 하나당 상한(백엔드 담당자 확인). */
export const RECORDING_FILE_MAX_BYTES = 5 * 1024 * 1024 * 1024;

const ACCEPTED_EXTENSIONS_LABEL = RECORDING_FILE_ACCEPTED_EXTENSIONS.join(", ");

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex + 1).toLowerCase();
}

/**
 * 확장자 → S3 업로드 요청·PUT에 실을 Content-Type. [확인] BE `RecordingFilePolicy
 * .ALLOWED_CONTENT_TYPES`(2026-08-18 실코드 대조) — BE는 확장자마다 여러 값(구형 브라우저
 * MIME·`application/octet-stream` 포함)을 받아 주는데, 여기 8종 전부 그 허용 집합 안에 든다.
 */
const RECORDING_CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  wav: "audio/wav",
  mp3: "audio/mpeg",
  mp4: "audio/mp4",
  m4a: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
  webm: "audio/webm",
  amr: "audio/amr",
};

/**
 * 업로드 URL 발급 요청·S3 PUT 양쪽에 **정확히 같은 값**을 싣기 위한 단일 출처(요구사항:
 * "Content-Type은 URL 발급 요청에서 전달한 값과 정확히 같아야 합니다") — 브라우저가 추정하는
 * `File.type`은 `amr`·`flac` 등에서 비어 있거나 브라우저마다 달라 믿지 않는다.
 */
export function contentTypeOf(fileName: string): string {
  return RECORDING_CONTENT_TYPE_BY_EXTENSION[extensionOf(fileName)] ?? "application/octet-stream";
}

/**
 * 파일 메타(이름·용량)만으로 하는 검증 — Server Action(서버, `File` 객체가 없다)과 클라이언트가
 * 같은 규칙 하나를 쓴다. 통과하면 `null`, 막을 사유가 있으면 화면에 보여줄 문구를 돌려준다.
 */
export function validateRecordingFileMeta(meta: {
  fileName: string;
  sizeBytes: number;
}): string | null {
  if (!RECORDING_FILE_ACCEPTED_EXTENSIONS.includes(extensionOf(meta.fileName))) {
    return `지원하지 않는 형식입니다 (${ACCEPTED_EXTENSIONS_LABEL}만 가능)`;
  }
  /*
    ⚠️ BE `RecordingFilePolicy.validate`가 0바이트도 막는다(413 CAP-024:
       "녹음 파일은 0바이트보다 크고 5GiB 이하여야 합니다."). FE가 상한만 보면 빈 파일이 S3에
       올라간 뒤에야 거절된다 — 파일 선택 시점에 잡는다.
  */
  if (meta.sizeBytes <= 0) {
    return "빈 파일입니다";
  }
  if (meta.sizeBytes > RECORDING_FILE_MAX_BYTES) {
    return "파일 용량이 5GiB를 넘었습니다";
  }
  return null;
}

/** 클라이언트 파일 선택 시점의 1차 검증 — `validateRecordingFileMeta`를 `File`에서 그대로 부른다. */
export function validateRecordingFile(file: File): string | null {
  return validateRecordingFileMeta({ fileName: file.name, sizeBytes: file.size });
}
