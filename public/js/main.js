'use strict';

function toggleSignIn() {
  if (!firebase.auth().currentUser) {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithRedirect(provider);
  } else {
    firebase.auth().signOut();
    document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
  }
  document.getElementById('login-logout').disabled = true;
}

function initApp() {

  $('.bs-component [data-toggle="popover"]').popover();
  $('.bs-component [data-toggle="tooltip"]').tooltip();

  firebase.auth().getRedirectResult().then(function(result) {
    // 特に何もしない
  }).catch(function(error) {
    console.error(error);
  });

  firebase.auth().onAuthStateChanged(function(user) { // 通常時の処理 (Google認証の後もTwitter認証の後も来る)
    if (user) {
      const email = user.email;
      const emailVerified = user.emailVerified;
      if (emailVerified && /.*@nnn.ed.jp$/.test(email)) { // リダイレクト後、Googleの nnn.ed.jp ログイン時
        console.log('User is signed in.');
        document.getElementById('login-logout').innerText = `${email}からログアウト`;

        const createGoogleUserJWT = firebase.functions().httpsCallable('createGoogleUserJWT');
        createGoogleUserJWT().then((result) => {
          sessionStorage.setItem('googleUser', JSON.stringify(result.data));

          // Twitter認証を開始
          const twitterProvider = new firebase.auth.TwitterAuthProvider();
          firebase.auth().signInWithRedirect(twitterProvider); // リダイレクト
        }).catch((e) => console.error(e));

      } else if (user.providerData[0].providerId === 'twitter.com') { // リダイレクト後、Twitter ログイン時
        createTweetableCondition(user)
      } else {
        // もしnnn.ed.jpドメインでなければメッセージ
        console.log('User is not nnn.ed.jp domain.');
        document.getElementById('alert-not-nnn').style.display = 'block';
        firebase.auth().signOut();
        document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
      }
    } else {
      console.log('User is signed out.');
      firebase.auth().signOut();
      document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
    }
    document.getElementById('login-logout').disabled = false;
  });

  document.getElementById('login-logout').addEventListener('click', toggleSignIn, false);
}


function createTweetableCondition(twitterUser) {
  console.log("createTweetableCondition");  // TODO 消す
  // TODO 証明ツイートのところを読み込み中に。
  const googleUser = JSON.parse(sessionStorage.getItem('googleUser'));

  if (!googleUser) { // セッションストレージからGoogleユーザーがとれなかったら、サインアウトしてやり直し
    firebase.auth().signOut();
    document.getElementById('login-logout').innerHTML = 'nnn.ed.jpドメインの<br>Googleアカウントでログイン';
    return;
  }
  
  document.getElementById('login-logout').innerText = `${googleUser.email}からログアウト`;
  console.log(googleUser);
  console.log(twitterUser);
  const twitterUID = twitterUser.providerData[0].uid;

  // functionsでツイートできるのかチェック
  const checkTweetable = firebase.functions().httpsCallable('checkTweetable');
  const pCheckTweetable = checkTweetable({
    googleUser : googleUser,
    twitterUID : twitterUID}).then((result) => {

    console.log(result);
  
  }).catch((e) => console.error(e));

  // TODO ツイートできない場合の処理
  // TODO ツイートさせる処理


}

document.addEventListener('DOMContentLoaded', function() {
  initApp();
});