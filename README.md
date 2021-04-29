プロット検証するやつ（仮称）
===

本拡張は、目論見通りの物書きができているか検証するためのツリービューを提供します。  
![file](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature.png)  


## 文字数確認の例
エクスプローラから、「ファイルを登録」します。  
![file1](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file1.png)  

追加されたファイルのメニューから、「項目を追加」します。  
追加する項目は、今回の例では「最小」です。  
![file2](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file2.png)  
  
![file3](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file3.png)  

ファイルに対する検証項目として、最低ラインが登録されます。  
薄字で、現在のファイル内容が表示されます。  
![file4](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file4.png)  

検証値を変えるため、メニューから「更新」します。  
今回は、25枚（400字詰め換算）とします。  
![file5](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file5.png)  
  
![file6](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file6.png)  
ファイル内容が不足するため、チェックマークが消えます。  
  
![file7](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-file7.png)  


## 設定ファイル
plot.json に設定が保存されます。  
拡張機能アンインストール時に削除はされないため、不要な場合手作業で削除してください。  
![json](https://github.com/n-fukuju/plot-verifier-vsce/raw/master/images/feature-json.png)  


## 注意
* UTF-8でのみ確認しています。
* 全角半角にかかわらず1字としてカウントします。
* 枚数換算は、改行を考慮するため、文字数と枚数は一致しません。
* 枚数換算は、句読点のぶら下げ（行末に収める）は考慮しません。

## アイコン
[ICOOON MONO](https://icooon-mono.com/)  

