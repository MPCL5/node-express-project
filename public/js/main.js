rawData = `Alborz Province
Ardabil Province
Bushehr Province
Chaharmahal and Bakhtiari Province
East Azerbaijan Province
Isfahan Province
Fars Province
Gilan Province
Golestan Province
Hamadan Province
Hormozgan Province
Ilam Province
Kerman Province
Kermanshah Province
Khuzestan Province
Kohgiluyeh and Boyer-Ahmad Province
Kurdistan Province
Lorestan Province
Markazi Province
Mazandaran Province
North Khorasan Province
Qazvin Province
Qom Province
Razavi Khorasan Province
Semnan Province
Sistan and Baluchestan Province
South Khorasan Province
Tehran Province
West Azerbaijan Province
Yazd Province
Zanjan Province`;

var data = rawData.split('\n');
var x = document.getElementById("state");

for(let i=0 ; i<data.length;i++)
{
    var option = document.createElement("option");
    option.text = data[i];
    Option.name = data[i];
    x.add(option);
}
