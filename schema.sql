-- ============================================================
-- People in Places — Supabase SQL Schema
-- 실행 순서: Supabase > SQL Editor > 전체 붙여넣기 후 Run
-- ============================================================


-- ============================================================
-- 0. Extensions
-- ============================================================

create extension if not exists "uuid-ossp";


-- ============================================================
-- 1. users (프로필 테이블 — auth.users와 1:1 연결)
-- ============================================================

create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text not null default '',
  phone       text not null default '',
  address     text not null default '',
  postcode    text not null default '',
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

comment on table public.users is '유저 프로필. auth.users와 1:1 연결.';


-- ============================================================
-- 2. products
-- ============================================================

create table public.products (
  id           uuid primary key default uuid_generate_v4(),
  title        text not null,
  category     text not null check (category in ('wallpaper', 'postcard')),
  price        integer not null check (price >= 0),
  status       text not null default 'active' check (status in ('active', 'soldout', 'hidden')),
  thumbnail    text not null default '',
  description  text not null default '',
  featured     boolean not null default true,
  created_at   timestamptz not null default now()
);

comment on table public.products is '판매 상품. category는 wallpaper/postcard만 허용.';


-- ============================================================
-- 3. notices
-- ============================================================

create table public.notices (
  id          uuid primary key default uuid_generate_v4(),
  title       text not null,
  category    text not null default 'notice' check (category in ('notice', 'event', 'shipping')),
  author      text not null default '관리자',
  content     text not null default '',
  views       integer not null default 0 check (views >= 0),
  likes       integer not null default 0 check (likes >= 0),
  visible     boolean not null default true,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

comment on table public.notices is '공지사항. visible=false면 목록에서 숨김.';


-- ============================================================
-- 4. orders
-- ============================================================

create table public.orders (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references public.users(id) on delete cascade,
  status         text not null default 'paid' check (status in ('paid', 'preparing', 'shipped', 'delivered', 'cancelled')),
  total_price    integer not null default 0 check (total_price >= 0),
  shipping_info  jsonb not null default '{}',
  order_date     date not null default current_date,
  created_at     timestamptz not null default now()
);

comment on table public.orders is '주문. shipping_info는 주문 시점 배송 정보 스냅샷(jsonb).';
comment on column public.orders.shipping_info is '{ recipient, phone, email, address, memo }';


-- ============================================================
-- 5. order_items (orders와 products 사이 중간 테이블)
-- ============================================================

create table public.order_items (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  product_id  uuid references public.products(id) on delete set null,
  title       text not null,
  thumbnail   text not null default '',
  category    text not null default '',
  price       integer not null check (price >= 0),
  quantity    integer not null default 1 check (quantity >= 1)
);

comment on table public.order_items is '주문 상품 라인. 상품 삭제 시 product_id만 null 처리(주문 기록 보존).';


-- ============================================================
-- 6. Indexes
-- ============================================================

create index on public.orders (user_id);
create index on public.orders (status);
create index on public.order_items (order_id);
create index on public.order_items (product_id);
create index on public.products (category);
create index on public.products (status);
create index on public.notices (visible, date desc);


-- ============================================================
-- 7. Row Level Security (RLS)
-- ============================================================

alter table public.users       enable row level security;
alter table public.products    enable row level security;
alter table public.notices     enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;


-- ── users ────────────────────────────────────────────────

-- 본인 프로필만 조회 가능
create policy "users: 본인 조회"
  on public.users for select
  using (auth.uid() = id);

-- 본인 프로필만 수정 가능
create policy "users: 본인 수정"
  on public.users for update
  using (auth.uid() = id);

-- 관리자는 전체 유저 조회 가능
create policy "users: 관리자 전체 조회"
  on public.users for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ── products ─────────────────────────────────────────────

-- 누구나 active/soldout 상품 조회 가능 (hidden 제외)
create policy "products: 공개 조회"
  on public.products for select
  using (status != 'hidden');

-- 관리자는 hidden 포함 전체 조회
create policy "products: 관리자 전체 조회"
  on public.products for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- 관리자만 상품 추가/수정/삭제
create policy "products: 관리자 추가"
  on public.products for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "products: 관리자 수정"
  on public.products for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "products: 관리자 삭제"
  on public.products for delete
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ── notices ──────────────────────────────────────────────

-- 누구나 visible 공지 조회 가능
create policy "notices: 공개 조회"
  on public.notices for select
  using (visible = true);

-- 관리자는 전체 조회
create policy "notices: 관리자 전체 조회"
  on public.notices for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

-- 관리자만 공지 추가/수정/삭제
create policy "notices: 관리자 추가"
  on public.notices for insert
  with check (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "notices: 관리자 수정"
  on public.notices for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "notices: 관리자 삭제"
  on public.notices for delete
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ── orders ───────────────────────────────────────────────

-- 본인 주문만 조회
create policy "orders: 본인 조회"
  on public.orders for select
  using (auth.uid() = user_id);

-- 로그인 유저만 주문 생성 (본인 user_id로만)
create policy "orders: 본인 생성"
  on public.orders for insert
  with check (auth.uid() = user_id);

-- 관리자는 전체 주문 조회 + 상태 변경
create policy "orders: 관리자 전체 조회"
  on public.orders for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );

create policy "orders: 관리자 상태 변경"
  on public.orders for update
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ── order_items ──────────────────────────────────────────

-- 본인 주문의 아이템만 조회
create policy "order_items: 본인 조회"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- 주문 생성 시 아이템도 함께 삽입
create policy "order_items: 본인 생성"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- 관리자는 전체 아이템 조회
create policy "order_items: 관리자 전체 조회"
  on public.order_items for select
  using (
    exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.role = 'admin'
    )
  );


-- ============================================================
-- 8. 회원가입 시 users 테이블 자동 생성 트리거
--    auth.users에 유저가 생성되면 public.users에도 자동 삽입
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, phone, address, postcode, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'postcode', ''),
    'user'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 9. 초기 데이터 — products (products-data.js 기반)
-- ============================================================

insert into public.products (title, category, price, status, thumbnail, description, featured) values
  ('[IPHONE] 장소 1', 'wallpaper', 1000, 'active', 'img/bridge.jpg',  '구매시 해당 기기에 맞는 비율의 사진을 다운로드 하실 수 있습니다.', true),
  ('[IPHONE] 장소 2', 'wallpaper', 1000, 'active', 'img/lawson.jpg',  '구매시 해당 기기에 맞는 비율의 사진을 다운로드 하실 수 있습니다.', true),
  ('[IPHONE] 장소 3', 'wallpaper', 1000, 'active', 'img/kamo.jpg',    '구매시 해당 기기에 맞는 비율의 사진을 다운로드 하실 수 있습니다.', true),
  ('장소 postcard 1', 'postcard',  1000, 'active', 'img/street.jpg',  '배송 상품입니다.', true),
  ('장소 postcard 2', 'postcard',  1000, 'active', 'img/img last.JPG','배송 상품입니다.', true),
  ('장소 postcard 3', 'postcard',  1000, 'active', 'img/bridge.jpg',  '배송 상품입니다.', true);


-- ============================================================
-- 10. 초기 데이터 — notices (notices-data.js 기반)
-- ============================================================

insert into public.notices (title, category, author, content, views, likes, visible, date) values
  (
    'PEOPLE IN PLACES 오픈 안내',
    'notice',
    '관리자',
    '<p>PEOPLE IN PLACES 공식 오픈을 알려드립니다.</p><p>앞으로 다양한 소식을 전해드리겠습니다.</p>',
    0, 0, true, '2026-03-01'
  ),
  (
    '배송 안내',
    'shipping',
    '관리자',
    '<p>주문 후 영업일 기준 3~5일 이내 출고됩니다.</p><p>배송 관련 문의는 인스타그램 DM으로 연락주세요.</p>',
    0, 0, true, '2026-03-05'
  );
