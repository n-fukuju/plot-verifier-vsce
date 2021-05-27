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

// 2週間分の作業データ
const days = [1,2,3,4,5,6,7, 8,9,10,11,12,13,14];
const size = [10,30,45,90,120,190,215, 225,235,285,310,340,350,365];
const diff = [10,20,15,45,30,70,25, 10,10,50,25,30,10,15];
for(let day of days){
    db.daily.insert({
        date: new Date(2021,0,day, 9,0,0),  // 月は0始まり。
        file: 'test.txt',
        size: size[day-1],
        diff: diff[day-1]
    }, (err)=>{
        if(err){ console.log('nedb error: ', err); }
    });
}
