import { BackgroundPreset, WoodenFishSkin, OracleCard, ChantTrack, AmbientTrack } from '../types/zen';

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'temple-golden',
    name: 'Chùa Cổ Mây Vàng',
    url: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1561055657-b9e0bf0fa360?auto=format&fit=crop&w=300&q=70',
    description: 'Gian chánh điện chùa cổ thanh tịnh với ánh đèn vàng ấm áp',
  },
  {
    id: 'candle-altar',
    name: 'Ban Thờ & Đèn Hoa Nến',
    url: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=300&q=70',
    description: 'Ánh nến hoa đăng lung linh tĩnh mịch nơi Phật đài',
  },
  {
    id: 'golden-palace',
    name: 'Cung Điện Vàng Kim',
    url: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=300&q=70',
    description: 'Điện thờ trang nghiêm ngập tràn hào quang vàng kim',
  },
  {
    id: 'mist-lake',
    name: 'Hồ Núi Sương Khói',
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=70',
    description: 'Mặt nước phẳng lặng sương khói ban mai như cõi tịnh độ',
  },
  {
    id: 'bamboo-forest',
    name: 'Rừng Trúc An Lạc',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2400&q=85',
    thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=300&q=70',
    description: 'Rặng trúc xanh rì rào trong làn nắng sớm tĩnh tại',
  },
];

export const WOODEN_FISH_SKINS: WoodenFishSkin[] = [
  {
    id: 'classic-wood',
    name: 'Gỗ Mít Cổ Truyền',
    primary: '#854d0e',
    accent: '#a16207',
    highlight: '#ca8a04',
    ringColor: '#b45309',
    description: 'Sắc nâu bóng gỗ mít già, mộc mạc và trang nghiêm',
  },
  {
    id: 'gold-leaf',
    name: 'Hoàng Kim Sa',
    primary: '#ca8a04',
    accent: '#eab308',
    highlight: '#fef08a',
    ringColor: '#a16207',
    description: 'Dát vàng kim lấp lánh, đại diện cho trí tuệ sáng ngời',
  },
  {
    id: 'jade-stone',
    name: 'Bạch Ngọc Bích',
    primary: '#047857',
    accent: '#059669',
    highlight: '#6ee7b7',
    ringColor: '#065f46',
    description: 'Ngọc bích thanh mát, mang lại tâm thái an hòa dịu dàng',
  },
  {
    id: 'obsidian',
    name: 'Hắc Đàn Hương',
    primary: '#262626',
    accent: '#404040',
    highlight: '#737373',
    ringColor: '#171717',
    description: 'Gỗ mun huyền bí, thu liễm tâm niệm, định tĩnh sâu sắc',
  },
];

export const CHANT_TRACKS: ChantTrack[] = [
  {
    id: 'om-mani',
    title: 'Om Mani Padme Hum',
    description: 'Lục Tự Đại Minh Chú - Khơi mở lòng từ bi vô lượng',
    synthType: 'om-mani',
  },
  {
    id: 'chu-dai-bi',
    title: 'Thần Chú Đại Bi',
    description: 'Thiên Thủ Thiên Nhãn Quán Thế Âm Bồ Tát linh ứng',
    synthType: 'chu-dai-bi',
  },
  {
    id: 'a-di-da-phat',
    title: 'Niệm Nam Mô A Di Đà Phật',
    description: 'Âm thanh tiếp dẫn tịnh độ, vạn sự thanh thản an nhàn',
    synthType: 'a-di-da-phat',
  },
  {
    id: 'tam-kinh',
    title: 'Bát Nhã Ba La Mật Đa Tâm Kinh',
    description: 'Soi sáng chân tâm, buông bỏ vạn ngã chấp phiền não',
    synthType: 'tam-kinh',
  },
];

export const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: 'rain',
    title: 'Mưa Rơi Mái Chùa',
    iconName: 'CloudRain',
    synthType: 'rain',
  },
  {
    id: 'stream',
    title: 'Suối Thiền Róc Rách',
    iconName: 'Waves',
    synthType: 'stream',
  },
  {
    id: 'wind-chimes',
    title: 'Chuông Gió Hiên Trúc',
    iconName: 'BellRing',
    synthType: 'wind-chimes',
  },
  {
    id: 'singing-bowl',
    title: 'Chuông Xoay 432Hz Tần Số Thư Giãn',
    iconName: 'Sparkles',
    synthType: 'singing-bowl',
  },
];

export const ORACLE_CARDS: OracleCard[] = [
  {
    id: 1,
    title: 'Tâm Như Chỉ Thủy',
    chineseTitle: '心如止水',
    verse: 'Gió động cành lay tâm chẳng động,\nNước trong thấy rõ ánh trăng soi.\nVạn sự đến đi đều như mộng,\nAn nhiên tự tại giữa dòng đời.',
    explanation: 'Khi mặt hồ phẳng lặng, vạn vật phản chiếu tỏ tường. Khi tâm hồn lắng dịu, trí tuệ tự nhiên phát sinh.',
    advice: 'Hôm nay, hãy chậm lại một nhịp thở trước mỗi quyết định. Đừng để ngoại cảnh làm xao động cõi lòng.',
  },
  {
    id: 2,
    title: 'Buông Bỏ Phiền Não',
    chineseTitle: '放下自得',
    verse: 'Nắm chặt tay vào thì trống rỗng,\nDang rộng bàn tay ôm đất trời.\nBuông gánh nặng lòng thanh thản bước,\nNgàn mây trôi nhẹ giữa mù khơi.',
    explanation: 'Nắm giữ càng chặt, đau khổ càng nhiều. Buông tay không phải là mất đi, mà là nhường chỗ cho sự an lạc.',
    advice: 'Hãy buông bỏ một điều khiến bạn trăn trở hôm nay: một lời nói vô tình, hoặc một kỳ vọng quá mức.',
  },
  {
    id: 3,
    title: 'Hoa Sen Trong Bùn',
    chineseTitle: '出淤泥而不染',
    verse: 'Nở giữa bùn lầy không nhiễm bẩn,\nTỏa ngát hương thơm giữa gió sương.\nNghịch cảnh tôi rèn tâm Bồ Đề,\nSen vàng thanh tịnh ngát mười phương.',
    explanation: 'Bùn nhơ chính là dưỡng chất nuôi dưỡng đóa sen tỏa hương. Khó khăn gian nan là bài học giúp tâm linh trưởng dưỡng.',
    advice: 'Đối diện với trở ngại bằng nụ cười bao dung. Mỗi thử thách đều ẩn chứa hạt mầm của sự thức tỉnh.',
  },
  {
    id: 4,
    title: 'Hiện Tại Mầu Nhiệm',
    chineseTitle: '把握當下',
    verse: 'Quá khứ đã qua không níu lại,\nTương lai chưa đến chớ âu lo.\nBây giờ ở đây hơi thở nhẹ,\nBình an ngay dưới bóng trăng soi.',
    explanation: 'Món quà duy nhất bạn thực sự sở hữu chính là giây phút này. Đừng để tâm trí lang thang giữa nuối tiếc và hoang mang.',
    advice: 'Uống một ngụm trà, cảm nhận hương thơm. Đi một bước chân, cảm nhận mặt đất. Chánh niệm ngay nơi này.',
  },
  {
    id: 5,
    title: 'Từ Bi Hỷ Xả',
    chineseTitle: '慈悲喜捨',
    verse: 'Mở rộng lòng thương muôn vạn nẻo,\nNiềm vui người khác chính là mình.\nKhông hờn không giận không oán hận,\nSáng rực tâm can ánh quang minh.',
    explanation: 'Lòng từ xua tan hận thù như ánh mặt trời làm tan băng tuyết. Cho đi niềm vui, gặt về sự thanh thản vô bờ.',
    advice: 'Gửi một lời chúc bình an thầm kín đến người đã từng làm bạn tổn thương.',
  },
  {
    id: 6,
    title: 'Tùy Duyên Bất Biến',
    chineseTitle: '隨緣自在',
    verse: 'Duyên đến thì đón duyên đi tiễn,\nHợp tan như bọt nước phù du.\nTùy duyên mà sống lòng không đổi,\nThanh thản mây bay cuối trời thu.',
    explanation: 'Vạn vật do duyên sinh, cũng do duyên diệt. Đón nhận mọi hoàn cảnh với tâm thái tự tại, giữ vững cốt cách thiện lương.',
    advice: 'Chấp nhận những điều không thể thay đổi, và nỗ lực hết mình với những điều trong tầm tay.',
  },
  {
    id: 7,
    title: 'Phúc Tuệ Song Tu',
    chineseTitle: '福慧雙修',
    verse: 'Gieo hạt mầm lành vào ruộng đất,\nVun bồi trí tuệ chiếu mười phương.\nPhúc đức viên mãn đời an lạc,\nĐường trần vững bước rạng hoa sương.',
    explanation: 'Làm việc thiện giúp tích lũy phước báo; quán chiếu sâu sắc giúp thắp sáng trí tuệ. Cả hai song hành mới đạt tới an vui viên mãn.',
    advice: 'Làm một việc tốt nhỏ bé mà không cần ai ghi nhận hôm nay.',
  },
  {
    id: 8,
    title: 'Lắng Nghe Sâu Sắc',
    chineseTitle: '聆聽梵音',
    verse: 'Im lặng nghe ngàn thông reo gió,\nNghe tiếng lòng sâu bớt thở dài.\nLắng nghe với tất cả bi mẫn,\nTan biến sầu bi đón ngày mai.',
    explanation: 'Im lặng là ngôn ngữ cao quý của sự đồng cảm. Khi biết lắng nghe mà không phán xét, mọi khoảng cách đều được hàn gắn.',
    advice: 'Lắng nghe trọn vẹn một người thân trò chuyện hôm nay mà không ngắt lời hay vội vã đưa ra lời khuyên.',
  }
];
