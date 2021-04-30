Plotexr
===

本拡張は、想定通りの物書きができているか検証するためのツリービューを提供します。  
主に小説用を想定しています。  
![file](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature.png)  


## クイックスタート
* エクスプローラから、「ファイルを登録」します。  
![file1](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file1.png)  

* 追加されたファイルのメニューから、「項目を追加」します。  
* 追加する項目は、今回の例では「最小」です。  
![file2](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file2.png)  
  
![file3](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file3.png)  

* ファイルに対する検証項目として、最低ラインが登録されます。  
* 薄字で、現在のファイル内容が表示されます。  
![file4](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file4.png)  

* 検証値を変えるため、メニューから「更新」します。  
* 今回は、25枚（400字詰め換算）とします。  
![file5](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file5.png)  
  
![file6](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file6.png)  
* ファイル内容が不足するため、チェックマークが消えます。  
![file7](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file7.png)  

* ファイル内容を更新して再度検証する場合、ツリービューの「更新」を実行します。
![file8](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file8.png)  



## 記述項目
記述項目は正規表現を使用できます。  
（以下の例の場合、煙草を捨てる記述はあるが拾う記述はない）  
![regex](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-regex.png)  
正規表現パターンは、MDN等を参照してください。  
[正規表現 - MDN](https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Regular_Expressions)  
なお、記述項目は行単位で検証しています。行をまたいだ検証は行いません。  

## 設定ファイル
* plot.json に設定が保存されます。複数人での作業に本拡張を用いる場合、設定ファイルも併せて共有してください。
![json](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-json.png)   
* 拡張機能アンインストール時に設定ファイルの削除は行われないため、不要な場合、手作業で削除してください。
* plot.json を直接編集した場合は、ツリービューの「更新」を実行することで、メモリ上の設定を破棄して再読み込みが行われます。
* ファイル移動はplot.jsonへ自動で反映されません。再登録が面倒であれば、plot.json内のパスを直接編集し、ツリービューの「更新」を実行します。


## 注意
* テキストファイルであれば拡張子は問いません。
* 文字数は全角半角にかかわらず1字としてカウントします。
* 枚数換算は改行を考慮するため、文字数と枚数は一致しません。
* 枚数換算は句読点のぶら下げ（行末に収める）は考慮しません。
* UTF-8でのみ動作確認しています。

## アイコン
[ICOOON MONO](https://icooon-mono.com/)  

