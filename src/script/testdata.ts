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
const diff1 = [10,20,15,45,30,70,25, 10,10,50,25,30,10,15];
const diff2 = [ 0, 0, 0, 0, 0, 0, 0,  0, 0,30, 5, 0,50,35];
let size1 = 0;
let size2 = 0;
for(let day=1;day<=14;day++){
    let d1 = diff1[day-1];
    let d2 = diff2[day-1];

    if(d1 > 0){
        db.daily.insert({
            date: new Date(2021,0,day, 9,0,0),  // 月は0始まり。
            file: 'file1.txt',
            size: size1 += d1,
            diff: d1,
            elapsed: d1 * 10,
        }, (err)=>{
            if(err){ console.log('nedb error: ', err); }
        });
    }
    if(d2 > 0){
        db.daily.insert({
            date: new Date(2021,0,day, 9,0,0),
            file: 'file2.txt',
            size: size2 += d2,
            diff: d2,
            elapsed: d2 * 10,
        }, (err)=>{
            if(err){ console.log('nedb error: ', err); }
        });
    }
}
