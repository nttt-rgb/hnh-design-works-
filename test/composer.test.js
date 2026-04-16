const { buildEmail } = require('../scripts/auto_pipeline/composer');

describe('composer.buildEmail', () => {
  it('includes shop name in subject', () => {
    const { subject } = buildEmail({ '店名': 'テストカフェ', 'エリア': '渋谷', '業種': 'カフェ' });
    expect(subject).toContain('テストカフェ');
  });

  it('includes area and category in subject', () => {
    const { subject } = buildEmail({ '店名': 'テスト店', 'エリア': '新宿', '業種': '美容室' });
    expect(subject).toContain('新宿');
    expect(subject).toContain('美容室');
  });

  it('includes portfolio URL in body', () => {
    const { body } = buildEmail({ '店名': 'テスト店', 'エリア': '新宿', '業種': '美容室' });
    expect(body).toContain('hnh-design-works.vercel.app');
  });

  it('includes intake form link', () => {
    const { body } = buildEmail({ '店名': 'テスト店', 'エリア': '新宿', '業種': '美容室' });
    expect(body).toContain('/intake.html');
  });

  it('uses industry-specific pitch for 美容室', () => {
    const { body } = buildEmail({ '店名': 'ヘアサロンX', 'エリア': '原宿', '業種': '美容室' });
    expect(body).toContain('スタイリスト');
  });

  it('uses generic pitch for unknown category', () => {
    const { body } = buildEmail({ '店名': '不明な店', 'エリア': '銀座', '業種': 'ゲームセンター' });
    expect(body).toContain('プロフェッショナル');
  });

  it('defaults to 御社 when shop name is missing', () => {
    const { subject, body } = buildEmail({ 'エリア': '池袋', '業種': 'カフェ' });
    expect(body).toContain('御社');
  });

  it('includes owner signature', () => {
    const { body } = buildEmail({ '店名': 'テスト', 'エリア': '渋谷', '業種': 'カフェ' });
    expect(body).toContain('HNH Design Works');
    expect(body).toContain('豊川');
  });

  it('includes unsubscribe notice', () => {
    const { body } = buildEmail({ '店名': 'テスト', 'エリア': '渋谷', '業種': 'カフェ' });
    expect(body).toContain('不要の場合');
  });
});
