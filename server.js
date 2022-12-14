require('dotenv').config();
const express = require('express');
const app = express();

/* socket.io 셋팅방법 */
const http = require('http').createServer(app);
const {Server} = require('socket.io');
const io = new Server(http);

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
const MongoClient = require('mongodb').MongoClient;
const { ObjectId } = require('mongodb');
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

  http.listen(process.env.PORT, function(){
    console.log('listening on 8080');
  });
  
  /* db.collection('post').insertOne({이름: 'John', 나이 : 20}, function(err, result){
    if(err){
      return console.log(err);
    }
    console.log('저장완료');
  }); */
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

app.get('/detail/:id', function(req, res){
  db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
    if(err){
      return console.log(err);
    }
    console.log(result);
    res.render('detail.ejs', { data : result });

  });
})

app.get('/edit/:id', function(req, res){
  db.collection('post').findOne({_id : parseInt(req.params.id)}, function(err, result){
    console.log(result);
    res.render('edit.ejs', { post : result })
  })
})

app.put('/edit',function(req, res){
  db.collection('post').updateOne({ _id : parseInt(req.body.id) }, { $set : { 제목 : req.body.title, 날짜 : req.body.date }}, function(err, result){
    res.redirect('/list');
  });
})


/* 로그인 */
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');

/* app.use => 미들웨어를 쓰고싶을때 사용 */
/* 미들웨어 : 요청과 응답 사이에 실행되는 코드 */
app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize());
app.use(passport.session());


app.get('/login', function(req, res){
  res.render('login.ejs');
})

app.post('/login', passport.authenticate('local', {
  failureRedirect : 'fail'
}), function(req, res){
  res.redirect('/');
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

app.get('/fail', function(req, res){
  res.render('fail.ejs');
})

/* 회원가입  */
app.get('/signup', function(req, res){
  res.render('signup.ejs');
})
app.post('/register', function(req, res){
  db.collection('login').insertOne( { id : req.body.id, pw : req.body.pw }, function(err, result){
    res.redirect('/');
  } )
})

/* 마이페이지 */
app.get('/mypage', checkUser, function(req, res){
  res.render('mypage.ejs', {사용자 : req.user});
})

function checkUser(req, res, next){
  if(req.user){
    next();
  } else {
    res.send('로그인 해주세요.');
  }
}

/* 검색기능 */
app.get('/search', (req, res) => {
  /* 제목 : req.query.value => 검색 속도가 느리다 */
  /* $text : { $search : req.query.value } => 한글 친화적이지 않음. 띄어쓰기 단위로 indexing 하기 때문에 단어만 쓰면 못찾음 */
  /* search index 사용 => 한글에 맞게 변경 가능 */
  let searchHow = [
    {
      $search: {
        index: 'searchTitle',/* 인덱스 명 */
        text: { /* 검색 요청 */
          query: req.query.value,
          path: '제목' /* 제목, 날짜 둘다 찾고 싶으면 ['제목', '날짜'] */ /* collection 안의 항목 */
        }
      }
    },
    /* 검색결과에서 필터주기 */
    /* 0은 안보여지게, 1은 보여지게, score는 검색어 관련도 점수 */
    { $project : { 제목: 1, _id: 1, score: { $meta: "searchScore" } } },
    /* 찾은 목록 정렬하기 */
    { $sort : { _id : 1 } }, 
    /* 10개만 짤라서 보여주기 */
    { $limit : 10 }
  ]
  db.collection('post').aggregate(searchHow).toArray((err, result) => {
    if(err) return console.log("err : ", err);
      console.log(result);
      res.render('search.ejs', {posts : result});
  });
})

/* 게시물 추가 */
app.post('/add', function(req, res){
  res.send('전송완료');
  db.collection('counter').findOne({name : '게시물갯수'}, function(err, result){
    if(err){
      return console.log(err)
    } 
    let totalPost = result.totalPost;
    let addNewPost = {_id : totalPost + 1, 제목: req.body.title, 날짜 : req.body.date, 작성자 : req.user._id};

    db.collection('post').insertOne(addNewPost, function(err, result){
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

/* 게시물 삭제 */
app.delete('/delete', function(req, res){
  req.body._id = parseInt(req.body._id);

  /* 아이디와 작성자가 일치하는 데이터 */
  let deleteData = { _id : req.body._id, 작성자 : req.user._id }

  db.collection('post').deleteOne(deleteData, function(err, result){
    if(err){
      return console.log(err);
    }
    /* 성공코드 보내기 */
    res.status(200).send({ message : "성공했습니다" });

    /* 실패코드 보내기 */
    // res.status(400).send({ message : "실패했습니다" });
  })
})

/* shop.js에서 변수 가져오기 */
/* '/shop' 경로로 요청했을 때 미들웨어 적용 */
app.use('/shop', require('./routes/shop.js'))
app.use('/board/sub', require('./routes/board.js'))


/* 이미지 업로드 */
/* multer 라이브러리 사용 */
let multer = require('multer');
let storage = multer.diskStorage({
  destination : function(req, file, cb){
    cb(null, './public/image')
  },
  filename : function(req, file, cb){
    cb(null, file.originalname)
  }
});

let path = require('path');
let upload = multer({
  storage: storage,
  fileFilter: function(req, file, callback) {
      let ext = path.extname(file.originalname);
      if(ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg') {
          return callback(new Error('PNG, JPG만 업로드하세요'))
      }
      callback(null, true)
  },
  limits:{
      fileSize: 1024 * 1024
  }
});

app.get('/upload', function(req, res){
  res.render('upload.ejs');
});

app.post('/upload', upload.single('profile'), function(req, res){
  res.send('업로드 완료');
});

/* 한번에 여러 이미지 업로드하기 (html 코드 변경해야함) */
/* app.post('/upload', upload.array('profile', 10), function(req, res){
  res.send('업로드 완료');
}); */

app.get('/image/:imageName', function(req, res){
  /* __dirname : 현재파일 경로 */
  res.sendFile(__dirname + '/public/image/' + req.params.imageName)
});

/* chatroom */
app.post('/chatroom', checkUser, function(req, res){
  let data = {
    title : '채팅방',
    member : [ObjectId(req.body.selectedUserId), req.user._id],
    date : new Date()
  }
  db.collection('chatroom').insertOne(data).then((result)=>{
    res.send('성공');
  });
});

app.get('/chat', checkUser, function(req, res){

  db.collection('chatroom').find({ member : req.user._id }).toArray().then((result)=>{
    /* result : db에서 찾은 결과 */
    res.render('chat.ejs', { data : result })
  })
})

app.post('/message', checkUser, function(req, res){
  let data = {
    parent : req.body.parent,
    content : req.body.content,
    userid : req.user._id,
    date : new Date()
  }
  db.collection('message').insertOne(data).then(()=>{
    console.log('DB저장성공');
    res.send('DB저장성공');
  }).catch(()=>{
    console.log('DB저장실패');
  })
});


/* 서버와 유저간 실시간 소통채널 열기 */
app.get('/message/:id', checkUser, function(req, res){
  /* 헤더 수정하기 */
  res.writeHead(200, {
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache"
  });

  /* 일반 GET, POST 요청은 1회 요청시 1회 응답만 가능 */
  /* 헤더 위와같이 수정 시 여러번 응답 가능 */

  db.collection('message').find({ parent : req.params.id }).toArray().then((result)=>{
    /* 유저에게 데이터 전송 */
    /* event: 보낼 데이터 \n */
    /* \n은 엔터의 의미 */
    /* 문자만 보내줄 수 있기 때문에 object나 array는 JSON형식으로 변경 */
    /* 안녕하세요 라는 이벤트를 테스트 명으로 전송 */
    res.write('event: test\n');
    res.write('data: ' + JSON.stringify(result) + '\n\n');
  })

  /* Change Stream 설정방법 */
  const pipeline = [
    /* 컬렉션 안의 원하는 document만 감시하고 싶으면 내용 추가 */
    { $match: { 'fullDocument.parent' : req.params.id } }
  ];
  const collection = db.collection('message');
  /* .watch() 붙이면 실시간으로 감시해줌 */
  const changeStream = collection.watch(pipeline);
  /* 해당 컬렉션에 변동 생기면 여기 코드가 실행됨 */
  changeStream.on('change', (result)=>{
    res.write('event: test\n');
    res.write('data: ' + JSON.stringify([result.fullDocument]) + '\n\n');
  });

});

/* socket.io */
app.get('/socket', function(req, res){
  res.render('socket.ejs');
})

/* 웹소켓에 접속하면 내부 코드 실행 */
io.on('connection', function(socket){
  console.log('socket io 접속완료');

  socket.on('room1-send', function(data){
    /* room1에 들어간 유저에게 전송 */
    io.to('room1').emit('broadcast', data);
  });

  /* 채팅방 1 */
  socket.on('joinroom', function(data){
    socket.join('room1');
  })

  /* user-send 라는 이름으로 메세지 보내면 내부 코드 실행 */
  socket.on('user-send', function(data){
    /* 서버에서 모든 유저에게 메세지 전송 */
    io.emit('broadcast', data);

    /* 서버에서 특정한 유저에게만 메세지 전송 */
    /* io.to(socket.id).emit('broadcast', data); */
  });

});

