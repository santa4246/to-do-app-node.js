require('dotenv').config();
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
const MongoClient = require('mongodb').MongoClient;
const methodOverride = require('method-override');
app.use(methodOverride('_method'));
app.set('view engine', 'ejs');

app.use('/public', express.static('public'));


var db;
/* 뫃고DB 연결 */
MongoClient.connect(process.env.DB_URL, function(err, client){
  /* 에러코드 */
  if(err){
    return console.log(err);
  }

  /* todoapp 이라는 database에 연결 */
  db = client.db('todoapp');

  app.listen(process.env.PORT, function(){
    console.log('listening on 8080');
  });
  
  /* db.collection('post').insertOne({이름: 'John', 나이 : 20}, function(err, result){
    if(err){
      return console.log(err);
    }
    console.log('저장완료');
  }); */
  

  app.post('/add', function(req, res){
    res.send('전송완료');
    db.collection('counter').findOne({name : '게시물갯수'}, function(err, result){
      if(err){
        return console.log(err)
      } 
      let totalPost = result.totalPost;

      db.collection('post').insertOne({_id : totalPost + 1, 제목: req.body.title, 날짜 : req.body.date}, function(err, result){
        if(err){
          return console.log(err);
        }
        db.collection('counter').updateOne({name : '게시물갯수'}, { $inc : {totalPost : 1}}, function(err, result){
          if(err){
            return console.log(err);
          }
        })
      });
    });
  })
})




app.get('/pet', function(req, res){
  res.send('펫 용품을 쇼핑할 수 있는 페이지입니다.');
})

app.get('/beauty', function(req, res){
  res.send('뷰티 용품을 쇼핑할 수 있는 페이지입니다.');
})

app.get('/', function(req, res){
  res.render('index.ejs');
})

app.get('/write', function(req, res){
  res.render('write.ejs');
})

app.get('/list', function(req, res){
  /* 디비에 저장된 post 컬렉션 안의 모든 데이터 가져오기 */
  db.collection('post').find().toArray(function(err, result){/* 디비에서 자료찾아오기 */
  /* 에러코드 */
    if(err){
      console.log(err);
    }
    console.log(result)
    /* ejs파일 랜더링 */
    res.render('list.ejs', { posts : result });
  });
  
})

app.delete('/delete', function(res, req){
  res.body._id = parseInt(res.body._id);
  db.collection('post').deleteOne(res.body, function(err, result){
    if(err){
      return console.log(err);
    }
    /* 성공코드 보내기 */
    req.status(200).send({ message : "성공했습니다" });

    /* 실패코드 보내기 */
    // req.status(400).send({ message : "실패했습니다" });
  })
})

app.get('/detail/:id', function(res, req){
  db.collection('post').findOne({_id : parseInt(res.params.id)}, function(err, result){
    if(err){
      return console.log(err);
    }
    console.log(result);
    req.render('detail.ejs', { data : result });

  });
})

app.get('/edit/:id', function(res, req){
  db.collection('post').findOne({_id : parseInt(res.params.id)}, function(err, result){
    console.log(result);
    req.render('edit.ejs', { post : result })
  })
})

app.put('/edit',function(res, req){
  db.collection('post').updateOne({ _id : parseInt(res.body.id) }, { $set : { 제목 : res.body.title, 날짜 : res.body.date }}, function(err, result){
    req.redirect('/list');
  });
})


/* 회원가입 & 로그인 */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize());
app.use(passport.session());


app.get('/login', function(res, req){
  req.render('login.ejs');
})

app.post('/login', passport.authenticate('local', {
  failureRedirect : 'fail'
}), function(res, req){
  req.redirect('/');
})

passport.use(new LocalStrategy({
  usernameField: 'id', /* form의 id라는 name을 가진 input의 value */
  passwordField: 'pw', /* form의 pw라는 name을 가진 input의 value */
  session: true, /* session 정보를 저장할 것인지? */
  passReqToCallback: false,
}, function(userInputId, userInputPw, done){
  console.log(userInputId, userInputPw);
  db.collection('login').findOne({id : userInputId}, function(err, result){
    /* done(서버에러, 성공시 사용자 db데이터, 에러메세지) */
    if(err) return done(err)
    if(!result) return done(null, false, {message : '존재하지 않는 아이디입니다.'})
    if(userInputPw == result.pw){
      return done(null, result)
    } else{
      return done(null, false, {message : '비밀번호가 일치하지 않습니다.'})
    }
  })
}))

passport.serializeUser(function(user, done){
  done(null, user.id)
})
passport.deserializeUser(function(아이디, done){
  /* db에서 유저를 찾은 뒤에 유저 정보를 done의 두번째 파라미터에 넣음 */
  db.collection('login').findOne({id : 아이디}, function(err, result){
    done(null, result)
  })
})

app.get('/fail', function(res, req){
  req.render('fail.ejs');
})

/* 마이페이지 */
app.get('/mypage', checkUser, function(res, req){
  req.render('mypage.ejs', {사용자 : res.user});
})

function checkUser(res, req, next){
  if(res.user){
    next();
  } else {
    req.send('로그인 해주세요.');
  }
}