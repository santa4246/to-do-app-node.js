const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended : true}));
const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

var db;
/* 뫃고DB 연결 */
MongoClient.connect('mongodb+srv://admin:qwer1234@cluster0.gxtyhfw.mongodb.net/?retryWrites=true&w=majority', function(err, client){
  /* 에러코드 */
  if(err){
    return console.log(err);
  }

  /* todoapp 이라는 database에 연결 */
  db = client.db('todoapp');
  
  /* db.collection('post').insertOne({이름: 'John', 나이 : 20}, function(err, result){
    if(err){
      return console.log(err);
    }
    console.log('저장완료');
  }); */
  

  app.post('/add', function(req, res){
    res.send('전송완료');
    db.collection('post').insertOne({제목: req.body.title, 날짜 : req.body.date}, function(err, result){
      if(err){
        return console.log(err);
      }
      console.log('저장완료');
    });
  })



  app.listen(8080, function(){
    console.log('listening on 8080');
  });
})




app.get('/pet', function(req, res){
  res.send('펫 용품을 쇼핑할 수 있는 페이지입니다.');
})

app.get('/beauty', function(req, res){
  res.send('뷰티 용품을 쇼핑할 수 있는 페이지입니다.');
})

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
})

app.get('/write', function(req, res){
  res.sendFile(__dirname + '/write.html');
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