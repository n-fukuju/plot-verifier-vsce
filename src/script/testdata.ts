/** ダッシュボード動作確認用のテストデータを作成するスクリプト */
import nedb = require('nedb');
const file = 'plotexr_workload.nedb';
const logFile = 'plotexr_workload_log.nedb';

const db = {
    daily: new nedb({
        filename: file,
        autoload: true
    }),
    // log: new nedb({
    //     filename: logFile,
    //     autoload: true
    // })
};

// 適当な作業データ
// 配列の長さは合わせるが、0の日は出力しない
const diff1 = [10,20,15,45,30,70,25, 10,10,50,25,30,10,15];
const diff2 = [ 0, 0, 0, 0, 0, 0, 0,  0, 0,30, 5, 0,50,35];
let size1 = 0;
let size2 = 0;
const now = new Date();
let date = new Date(now.setDate(now.getDate() - diff1.length ));
console.log('date1: ', date);
date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9,0,0);
console.log('date2: ', date);
for(let day=1;day<=14;day++){
    date = new Date(date.setDate(date.getDate()+1));
    console.log('date: ', date);
    let d1 = diff1[day-1];
    let d2 = diff2[day-1];
    // let elap = (Math.floor(Math.random() * 10 + 1) +5) /10 ; // 0.5 ~ 1.5
    let elap = Math.floor((Math.random() * 30 + 1) /10); // 0.1 ~ 3.0

    if(d1 > 0){
        db.daily.insert({
            date: date, //new Date(2021,0,day, 9,0,0),  // 月は0始まり。
            dateString: date.toString(),
            time: date.getTime(),
            file: 'file1.txt',
            size: size1 += d1,
            diff: d1,
            elapsed: d1 * elap,
        }, (err)=>{
            if(err){ console.log('nedb error: ', err); }
        });
    }
    if(d2 > 0){
        db.daily.insert({
            date: date, //new Date(2021,0,day, 9,0,0),
            dateString: date.toString(),
            time: date.getTime(),
            file: 'file2.txt',
            size: size2 += d2,
            diff: d2,
            elapsed: d2 * elap,
        }, (err)=>{
            if(err){ console.log('nedb error: ', err); }
        });
    }
}
