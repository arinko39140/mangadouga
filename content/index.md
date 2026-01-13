---
layout: layout.njk
title: マイページ
pageType: mypage
---

<div class="top-row">
  <a class="site-name" href="/">サイト名</a>
</div>

<div class="profile-row">
  <div class="avatar" aria-hidden="true"></div>
  <div>
    <div class="profile-name hand">ありんこ太郎</div>
    <div class="section-note">ユーザー情報</div>
  </div>
  <a class="edit-link" href="#">✎</a>
</div>

<div class="link-row">
  <a class="link-chip" href="https://example.com" target="_blank" rel="noreferrer">HP</a>
  <a class="link-chip" href="https://x.com" target="_blank" rel="noreferrer">X</a>
  <a class="link-chip" href="https://youtube.com" target="_blank" rel="noreferrer">YT</a>
  <span class="hand">他サイトリンク</span>
</div>

<section class="section" data-toggle-group="oshi-list" data-default-visibility="public">
  <div class="section-header">
    <a class="section-title" href="/oshi-list/">推しリスト</a>
    <div class="toggle-group">
      <button class="toggle" data-visibility="public" type="button">公開</button>
      <button class="toggle" data-visibility="private" type="button">非公開</button>
    </div>
  </div>
  <div class="section-body">
    <div class="gallery">
      <div class="tile">
        <div class="tile-box"></div>
        <div class="tile-title">タイトル</div>
      </div>
      <div class="tile">
        <div class="tile-box"></div>
        <div class="tile-title">タイトル</div>
      </div>
      <div class="tile">
        <div class="tile-box"></div>
        <div class="tile-title">タイトル</div>
      </div>
    </div>
  </div>
</section>

<section class="section" data-toggle-group="oshi-works" data-default-visibility="public">
  <div class="section-header">
    <a class="section-title" href="/oshi-works/">推し作品</a>
    <div class="toggle-group">
      <button class="toggle" data-visibility="public" type="button">公開</button>
      <button class="toggle" data-visibility="private" type="button">非公開</button>
    </div>
  </div>
  <div class="section-body">
    <div class="list-row">
      <div class="thumb">サムネ</div>
      <div class="title">作品タイトル：星降る放課後</div>
    </div>
  </div>
</section>

<section class="section" data-toggle-group="favorite-list" data-default-visibility="public">
  <div class="section-header">
    <a class="section-title" href="/favorite-list/">お気に入り推しリスト</a>
    <div class="toggle-group">
      <button class="toggle" data-visibility="public" type="button">公開</button>
      <button class="toggle" data-visibility="private" type="button">非公開</button>
    </div>
  </div>
  <div class="section-body">
    <div class="favorite-list">
      <div class="favorite-item">
        <div class="avatar" aria-hidden="true"></div>
        <div class="name">ユーザー名：みずき</div>
      </div>
      <div class="favorite-item">
        <div class="avatar" aria-hidden="true"></div>
        <div class="name">ユーザー名：はると</div>
      </div>
    </div>
  </div>
</section>
