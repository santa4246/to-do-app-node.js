let router = require('express').Router();

function checkUser(res, req, next){
  if(res.user){
    next();
  } else {
    req.send('로그인 해주세요.');
  }
}

/* 모든 router에 미들웨어 적용 */
router.use(checkUser);

router.get('/shirts', function(req, res){
  res.send('셔츠 파는 페이지입니다.')
})

router.get('/pants', function(req, res){
  res.send('바지 파는 페이지입니다.')
})

/* 파일 내보내기 */
module.exports = router;