INSERT INTO "feed_channels" ("description", "language", "slug", "title")
VALUES (
	'오늘과 같은 날짜에 있었던 역사적 순간을 출처와 함께 소개합니다.',
	'ko-KR',
	'today-in-history',
	'오늘 있었던 역사적 순간'
)
ON CONFLICT ("slug") DO NOTHING;
