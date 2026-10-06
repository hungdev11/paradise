# Task 1 Brief: Domain Models & Kiểu Dữ Liệu Tương Tác

## Objective
Thêm các domain models và type definitions vào `src/types/zen.ts`:
- `WishRibbonColor`
- `BodhiWishRibbon`
- `SocialActionType`
- `PlayerSocialStatus`
- `MeditationCluster`
- Cập nhật interface `PlazaPlayer` với `socialStatus?: PlayerSocialStatus;` và `inMeditationCluster?: boolean;`

## Requirements
Modify: `src/types/zen.ts`

Thêm các types sau:
```typescript
export type WishRibbonColor = 'red' | 'yellow' | 'blue' | 'pink' | 'purple';

export interface BodhiWishRibbon {
  id: string;
  senderId: string;
  senderName: string;
  color: WishRibbonColor;
  wishText: string;
  createdAt: number;
  rejoiceCount: number;
  rejoicedBy: string[]; // Danh sách playerId đã tùy hỷ
  branchIndex: number;  // 0 - 15 vị trí cành cây
}

export type SocialActionType = 'offer_tea' | 'gift_lotus' | 'mutual_bow';

export interface PlayerSocialStatus {
  type: SocialActionType;
  partnerId?: string;
  partnerName?: string;
  expiresAt: number; // Timestamp ms hết hạn hiệu ứng
}

export interface MeditationCluster {
  id: string;
  playerIds: string[];
  centerX: number;
  centerY: number;
  radius: number;
  durationSeconds: number;
}
```

Và mở rộng `PlazaPlayer`:
```typescript
export interface PlazaPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  hat: 'none' | 'non_la' | 'halo' | 'lotus';
  weapon?: 'gun' | 'hammer' | 'knife' | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: 1 | -1;
  isMoving: boolean;
  action: StickmanAction;
  lastActionTime: number;
  chatText?: string;
  chatTime?: number;
  isLocal?: boolean;
  merits: number;
  defeatUntil?: number;
  socialStatus?: PlayerSocialStatus;
  inMeditationCluster?: boolean;
}
```

## Global Constraints
- Tất cả lệnh kiểm tra và shell phải dùng tiền tố `rtk`.
- Chạy `rtk tsc -b` để xác nhận 0 lỗi biên dịch.
- Git commit message phải kết thúc bằng:
Co-Authored-By: Claude Code <noreply@anthropic.com>

## Report
Ghi báo cáo kết quả thực thi vào `docs/superpowers/plans/task-1-report.md`.
