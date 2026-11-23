/*
 * Universal Human Physical Work Taxonomy — seed data
 * Four levels: Domain > Physical scene > Workflow > Observable task.
 * This is an extensible planning ontology, not an official industry standard.
 */
(function () {
  'use strict';

  const SKILL_FAMILIES = [
    { id: 'locomotion', name: 'Locomotion & posture', zh: '移动与姿态', color: '#6d7dd7', examples: 'Walking, climbing, reaching, balancing', examplesZh: '步行、攀爬、伸手取物、保持平衡' },
    { id: 'handling', name: 'Object handling', zh: '物体取放搬运', color: '#278b7c', examples: 'Picking, placing, stacking, carrying', examplesZh: '拾取、放置、堆叠、搬运' },
    { id: 'articulated', name: 'Articulated objects', zh: '关节物体操作', color: '#d38b4a', examples: 'Doors, drawers, lids, hinges', examplesZh: '操作门、抽屉、盖子和铰链' },
    { id: 'precision', name: 'Precision manipulation', zh: '精密操作', color: '#8166c7', examples: 'Alignment, insertion, fastening', examplesZh: '对准、插入、紧固' },
    { id: 'tools', name: 'Tool use', zh: '工具使用', color: '#c16b6b', examples: 'Cutting, drilling, wiping, scraping', examplesZh: '切割、钻孔、擦拭、刮除' },
    { id: 'deformable', name: 'Deformable handling', zh: '柔性物体操作', color: '#6396bb', examples: 'Folding clothing, handling cables and bags', examplesZh: '折叠衣物、整理线缆、操作袋子' },
    { id: 'fluids', name: 'Fluids & granular materials', zh: '液体与颗粒物', color: '#4093a1', examples: 'Pouring, scooping, mixing, dispensing', examplesZh: '倾倒、舀取、混合、分配' },
    { id: 'bimanual', name: 'Bimanual coordination', zh: '双手协同', color: '#af7c52', examples: 'Holding and manipulating, handovers', examplesZh: '一手固定一手操作、双手交接' },
    { id: 'interaction', name: 'Human/animal interaction', zh: '人与动物交互', color: '#c27ca2', examples: 'Assisted dressing, caregiving, handovers', examplesZh: '辅助穿衣、照护、递交物品' },
    { id: 'inspection', name: 'Inspection & machine operation', zh: '检测与设备操作', color: '#768799', examples: 'Measurement, scanning, machine controls', examplesZh: '测量、扫码、操作设备控制件' }
  ];

  const skillCodes = {
    L: 'locomotion', H: 'handling', A: 'articulated', P: 'precision', T: 'tools',
    D: 'deformable', F: 'fluids', B: 'bimanual', I: 'interaction', M: 'inspection'
  };

  // Each row contains a Chinese path, an English path, and skill codes for its tasks.
  // Paths use scene | workflow | task;task. Skill codes follow the same task order.
  const raw = [
    {
      id: '01', name: '农林牧渔', en: 'Agriculture & fisheries', icon: '🌱', color: '#4b9372', rows: [
        ['大田农业|播种与田间管理|装填种子;施肥', 'Field farming|Sowing and field management|Load seeds;Apply fertilizer', 'HF;F'],
        ['温室园艺|植株养护|移栽;剪枝;绑蔓', 'Greenhouse horticulture|Plant care|Transplant seedlings;Prune branches;Tie vines', 'H;TP;DBP'],
        ['畜牧养殖|日常饲养|投喂饲料;清理栏舍', 'Livestock farming|Routine animal husbandry|Distribute feed;Clean pens', 'FI;T'],
        ['水产养殖与渔业|捕捞与分级|收网;取鱼;分类入箱', 'Aquaculture and fisheries|Harvesting and grading|Haul in a net;Remove fish;Sort into crates', 'DB;HI;H'],
        ['林业作业|造林与养护|植树;修枝', 'Forestry operations|Establishment and maintenance|Plant trees;Trim branches', 'HT;TP']
      ]
    },
    {
      id: '02', name: '资源开采', en: 'Extraction & mining', icon: '⛏', color: '#a17e60', rows: [
        ['露天矿场|勘探与取样|采集矿样;装袋贴签', 'Open-pit mine|Exploration and sampling|Collect mineral samples;Bag and label samples', 'HT;DHP'],
        ['地下矿井|开采辅助|安装支护件;整理工具', 'Underground mine|Mining support|Install supports;Organize tools', 'TBP;H'],
        ['油气井场|井口作业|连接管件;操作阀门', 'Oil and gas well site|Wellhead operations|Connect pipe fittings;Operate valves', 'BP;A'],
        ['采石砂石场|原料分选|挑选石块;分类堆放', 'Quarry and aggregate site|Raw material sorting|Pick out stones;Sort into piles', 'H;H']
      ]
    },
    {
      id: '03', name: '工业制造', en: 'Manufacturing', icon: '⚙', color: '#5479c9', rows: [
        ['汽车与机械装配|零部件装配|对孔;插装;螺栓紧固', 'Automotive and mechanical assembly|Component assembly|Align holes;Insert and fit parts;Tighten bolts', 'BP;P;TP'],
        ['电子电器装配|PCB及线束装配|对准并插入连接器;整理线束', 'Electronics and appliance assembly|PCB and wiring harness assembly|Align and insert connectors;Organize wire harnesses', 'P;D'],
        ['冶金化工材料加工|配料与投料|称量;倒料;操作料阀', 'Metals and chemical materials processing|Batching and feeding|Weigh ingredients;Pour material;Operate the feed valve', 'FM;F;AM'],
        ['纺织服装生产|裁剪与缝制|沿标线裁布;缝合', 'Textile and garment production|Cutting and sewing|Cut fabric along markings;Sew pieces together', 'DTP;DTP'],
        ['食品医药工业|分装与包装|灌装;封盖;装托盘', 'Food and pharmaceutical production|Filling and packaging|Fill containers;Seal caps;Load trays', 'F;AP;H'],
        ['工业质检与测试|测量与分选|卡尺测量;扫码分级', 'Industrial inspection and testing|Measuring and sorting|Measure with calipers;Scan and grade items', 'TMP;M'],
        ['手工制造作坊|定制加工|打磨;钻孔;组装', 'Hand manufacturing workshop|Custom fabrication|Sand surfaces;Drill holes;Assemble parts', 'T;TP;BP']
      ]
    },
    {
      id: '04', name: '建筑与工程', en: 'Construction & civil engineering', icon: '▥', color: '#ba8a4c', rows: [
        ['房屋主体施工|结构施工|绑钢筋;砌砖', 'Building construction site|Structural construction|Tie reinforcing bars;Lay bricks', 'DBP;HP'],
        ['室内装修|墙地面施工|刷漆;贴砖;填缝', 'Interior renovation site|Wall and floor installation|Apply paint;Lay tiles;Fill joints', 'TF;HP;TFP'],
        ['建筑机电安装|管线装配|接管;穿线;紧固', 'Building services installation|Pipe and conduit assembly|Connect pipes;Pull wires;Tighten fasteners', 'BP;DB;TP'],
        ['道路桥梁隧道|道路设施施工|设置路锥;安装构件', 'Road, bridge and tunnel site|Road infrastructure installation|Set out traffic cones;Install components', 'H;BP'],
        ['拆除与改造|拆除清运|拆卸面板;分类装袋', 'Demolition and renovation site|Dismantling and debris removal|Remove panels;Sort and bag debris', 'TA;DH']
      ]
    },
    {
      id: '05', name: '能源与公用事业', en: 'Utilities & energy', icon: '⚡', color: '#c49a43', rows: [
        ['发电厂与变电站|设备巡检|读表;记录;检查开关', 'Power plant and substation|Equipment inspection|Read a meter;Record readings;Inspect switches', 'M;M;AM'],
        ['光伏与风电设施|设施维护|清洁组件;检查紧固件', 'Solar and wind installations|Site maintenance|Clean modules;Inspect fasteners', 'T;TM'],
        ['供水与污水处理|采样与维护|灌装水样;更换滤芯', 'Water and wastewater facility|Sampling and maintenance|Bottle water samples;Replace a filter cartridge', 'F;P'],
        ['供热燃气设施|管网维护|操作阀门;检查连接', 'Heating and gas facilities|Network maintenance|Operate valves;Inspect connections', 'A;M'],
        ['储能与充电设施|日常运行服务|插拔充电枪;检查接口', 'Energy storage and charging facilities|Routine operation|Connect or disconnect a charging plug;Inspect ports', 'P;M']
      ]
    },
    {
      id: '06', name: '交通运输', en: 'Transportation', icon: '🚚', color: '#6294b0', rows: [
        ['公路客货运输|车辆运营准备|检查车况;装卸行李', 'Road passenger and freight transport|Vehicle preparation|Check vehicle condition;Load or unload luggage', 'M;H'],
        ['轨道交通与车站|站务保障|摆放隔离栏;整理设备', 'Rail transit and stations|Station support|Position barriers;Organize equipment', 'H;H'],
        ['机场与航空地勤|地面保障|放置轮挡;搬运行李', 'Airport and aircraft ramp|Ground support|Place wheel chocks;Move luggage', 'HP;H'],
        ['港口与船舶|甲板与码头作业|系缆;整理船用工具', 'Ports and vessels|Deck and dock operations|Secure mooring lines;Organize shipboard tools', 'DB;H'],
        ['公共与微出行交通|车辆运营|骑行;停车;车辆调度', 'Public and micromobility transport|Vehicle operations|Ride a vehicle;Park a vehicle;Reposition vehicles', 'LM;LM;LM']
      ]
    },
    {
      id: '07', name: '仓储物流', en: 'Warehousing & delivery', icon: '▤', color: '#7285bd', rows: [
        ['收货入库区|收货验收|拆箱;扫码;清点', 'Receiving area|Inbound inspection|Unpack boxes;Scan barcodes;Count items', 'AD;M;M'],
        ['仓库货架区|上架与盘点|搬箱上架;扫描货位', 'Warehouse shelves|Putaway and inventory|Lift boxes onto shelves;Scan storage locations', 'HL;M'],
        ['订单履约区|拣选配货|取SKU;放入周转箱', 'Order fulfillment area|Picking and filling orders|Pick an SKU;Place it in a tote', 'H;H'],
        ['包装与分拨区|包装发运|折箱;封箱;贴运单', 'Packing and sorting area|Packing and dispatch|Fold a carton;Seal a carton;Apply a shipping label', 'DB;DT;P'],
        ['末端配送|包裹投递|搬运包裹;放入快递柜', 'Last-mile delivery|Parcel delivery|Carry a parcel;Place it in a parcel locker', 'HL;HA']
      ]
    },
    {
      id: '08', name: '商业零售', en: 'Commerce & retail', icon: '◫', color: '#b5866e', rows: [
        ['超市便利店|货架运营|补货;理货;价签替换', 'Supermarket and convenience store|Shelf operations|Restock shelves;Face products;Replace price tags', 'H;H;P'],
        ['服饰零售店|商品整理|折衣;挂衣;整理货架', 'Apparel store|Merchandise organization|Fold clothes;Hang clothes;Organize displays', 'DB;DH;H'],
        ['生鲜与农贸市场|称量包装|挑选果蔬;装袋称重', 'Fresh food and farmers\' market|Weighing and packing|Select produce;Bag and weigh produce', 'H;DHM'],
        ['专卖店与展厅|展示与商品服务|拆盒;陈列;演示商品', 'Specialty store and showroom|Display and product service|Open packaging;Arrange products;Demonstrate a product', 'A;H;H'],
        ['电商退换货中心|退货检查|开箱;检视;复原包装', 'E-commerce returns center|Returns inspection|Unbox an item;Inspect the item;Restore the packaging', 'A;M;DB']
      ]
    },
    {
      id: '09', name: '餐饮服务', en: 'Food service', icon: '◈', color: '#b87e58', rows: [
        ['后厨备餐区|食材预处理|洗菜;切配;分装', 'Kitchen prep area|Ingredient preparation|Wash vegetables;Chop and portion ingredients;Pack into portions', 'BH;TP;HF'],
        ['热厨烹饪区|烹饪制作|翻炒;搅拌;倒料', 'Hot kitchen|Cooking|Stir-fry;Stir;Pour ingredients', 'TB;TB;F'],
        ['烘焙与冷食区|食品制作|揉面;裱花;摆盘', 'Bakery and cold food prep|Food production|Knead dough;Pipe decorations;Plate food', 'DB;P;HP'],
        ['餐厅前厅|出餐与收台|端盘;上菜;撤餐具', 'Dining room|Table service and clearing|Carry plates;Serve dishes;Clear tableware', 'H;H;H'],
        ['饮品制作区|饮品制作|冲泡;调配;封杯', 'Beverage station|Beverage preparation|Brew a drink;Mix a drink;Seal a cup', 'F;F;AM']
      ]
    },
    {
      id: '10', name: '酒店与文旅', en: 'Hospitality & tourism', icon: '☼', color: '#a97896', rows: [
        ['酒店客房|客房整理|铺床;换布草;补耗材', 'Hotel guest room|Room turnover|Make a bed;Change linens;Replenish supplies', 'DB;DB;H'],
        ['酒店公共区域|礼宾与后勤|搬运行李;布置会场', 'Hotel public areas|Concierge and event support|Move luggage;Set up a venue', 'HL;H'],
        ['景区游乐设施|游客服务|发放装备;整理安全护具', 'Visitor attractions and rides|Visitor services|Hand out equipment;Organize protective gear', 'H;H'],
        ['露营与度假营地|营地运营|搭帐篷;摆放桌椅', 'Campground and resort camp|Camp operations|Pitch a tent;Set out tables and chairs', 'DB;H']
      ]
    },
    {
      id: '11', name: '家庭与日常生活', en: 'Domestic life', icon: '⌂', color: '#4da2a0', rows: [
        ['家庭厨房|家庭烹饪|洗菜;切菜;操作灶具', 'Home kitchen|Home cooking|Wash vegetables;Cut vegetables;Operate the stove', 'BH;TP;M'],
        ['客厅与卧室|家居整理|叠衣;整理床铺;收纳', 'Living room and bedroom|Home tidying|Fold clothes;Make the bed;Put items away', 'DB;DB;H'],
        ['卫浴与洗衣区|衣物护理|洗衣;晾晒;清洁卫浴', 'Bathroom and laundry area|Laundry and cleaning|Wash clothes;Hang laundry;Clean the bathroom', 'DM;DH;T'],
        ['家庭设施|日常维护|更换灯泡;紧固家具', 'Home fixtures|Routine home maintenance|Replace a light bulb;Tighten furniture fittings', 'P;TP'],
        ['育儿与家庭照护|日常照料|换尿布;整理婴儿用品', 'Childcare and home care|Daily care|Change a diaper;Organize baby supplies', 'DI;H'],
        ['个人生活空间|个人自理|穿衣;洗漱;系鞋带', 'Personal living space|Personal care|Get dressed;Wash and groom;Tie shoelaces', 'DB;B;DBP']
      ]
    },
    {
      id: '12', name: '医疗与照护', en: 'Healthcare & care', icon: '✚', color: '#ba7283', rows: [
        ['医院门诊|诊疗辅助|准备器械;传递用品', 'Outpatient clinic|Clinical support|Prepare instruments;Pass supplies', 'H;HI'],
        ['住院病房|病房护理|整理病床;协助进食', 'Inpatient ward|Bedside care|Make a hospital bed;Assist with eating', 'DB;IF'],
        ['手术室|手术准备|摆放器械;整理耗材', 'Operating room|Operating room setup|Lay out instruments;Organize consumables', 'HP;H'],
        ['药房与检验室|样本及药品处理|取放试管;贴标;分装', 'Pharmacy and testing lab|Specimen and medication handling|Handle test tubes;Apply labels;Portion into containers', 'HP;P;F'],
        ['康复治疗中心|康复辅助|调整支具;准备训练器材', 'Rehabilitation center|Rehabilitation support|Adjust a brace;Prepare exercise equipment', 'API;H'],
        ['养老与残障照护机构|日常生活支持|辅助穿衣;辅助移乘', 'Elder and disability care facility|Daily living support|Assist with dressing;Assist with transfers', 'DI;BI']
      ]
    },
    {
      id: '13', name: '教育与科研', en: 'Education & research', icon: '◉', color: '#8b82bf', rows: [
        ['学校教室|教学准备|发放教具;整理课桌', 'School classroom|Lesson preparation|Distribute teaching aids;Arrange desks', 'H;H'],
        ['理化生实验室|实验操作|移液;加样;摆放试管', 'Science laboratory|Laboratory procedures|Pipette liquid;Add a sample;Arrange test tubes', 'TFP;FP;HP'],
        ['工程试验平台|实验设备搭建|安装夹具;固定传感器', 'Engineering test station|Test equipment setup|Install a fixture;Secure a sensor', 'TP;TP'],
        ['野外科研场地|样本采集|取样;封装;贴标', 'Field research site|Sample collection|Collect a sample;Seal a sample;Label a sample', 'HT;A;P'],
        ['图书馆档案馆|资料管理|取书;归档;上架', 'Library and archives|Material management|Retrieve a book;File materials;Shelve materials', 'H;H;H']
      ]
    },
    {
      id: '14', name: '办公与专业服务', en: 'Office & business services', icon: '▦', color: '#778fa7', rows: [
        ['普通办公室|行政后勤|整理文件;补办公用品', 'General office|Administrative support|Organize documents;Restock office supplies', 'DH;H'],
        ['会议与商务空间|会议准备|摆席卡;调整桌椅', 'Meeting and business spaces|Meeting preparation|Set out place cards;Adjust tables and chairs', 'HP;H'],
        ['银行与金融柜台|票据实物处理|整理票据;点钞;盖章', 'Banking and finance counter|Paperwork and cash handling|Sort vouchers;Count cash;Stamp documents', 'DH;M;TP'],
        ['文印与邮务中心|文件制作|装纸;装订;封装', 'Print and mail center|Document production|Load paper;Bind documents;Pack documents', 'DHM;DTP;DB'],
        ['专业服务工作室|样品与材料管理|取放样品;制作展示模型', 'Professional services studio|Sample and material management|Handle samples;Build a display model', 'H;BTP']
      ]
    },
    {
      id: '15', name: '信息通信基础设施', en: 'ICT infrastructure', icon: '⌘', color: '#6589b7', rows: [
        ['数据中心机房|服务器运维|插拔线缆;安装设备模块', 'Data center server room|Server maintenance|Connect or disconnect cables;Install equipment modules', 'DP;P'],
        ['通信机房与基站|通信设施部署|整理线缆;固定连接件', 'Telecom equipment room and base station|Telecom deployment|Organize cables;Secure fittings', 'D;TP'],
        ['电子设备维修站|设备检测与维修|拆装外壳;插接测试探头', 'Electronics repair station|Equipment testing and repair|Remove or install a casing;Connect a test probe', 'TA;TP'],
        ['广播与转播设施|设备布置|安装机架;连接信号线', 'Broadcast facility|Equipment setup|Install a rack;Connect signal cables', 'TB;DP']
      ]
    },
    {
      id: '16', name: '城市与环境服务', en: 'Urban & environmental services', icon: '♻', color: '#539b88', rows: [
        ['城市道路|道路保洁|清扫路面;拾取垃圾', 'Urban streets|Street cleaning|Sweep pavement;Pick up litter', 'T;H'],
        ['社区与物业|设施保洁维护|更换垃圾袋;清洁公共设备', 'Residential and property sites|Facility cleaning and maintenance|Replace bin liners;Clean shared equipment', 'DA;T'],
        ['公园与绿地|绿化养护|修剪植物;灌溉', 'Parks and green spaces|Landscape maintenance|Trim plants;Irrigate plants', 'TP;TF'],
        ['垃圾分选回收站|资源回收|纸塑分类;拆解可回收物', 'Waste sorting and recycling station|Material recovery|Sort paper and plastic;Dismantle recyclable items', 'H;TB'],
        ['市政公共设施|设施巡检|检查路灯;检查井盖和护栏', 'Municipal public facilities|Facility inspection|Inspect streetlights;Inspect manhole covers and railings', 'M;M'],
        ['水域与海岸|水域保洁|用网具收集漂浮垃圾', 'Waterways and coastlines|Waterway cleanup|Collect floating litter with a net', 'T']
      ]
    },
    {
      id: '17', name: '公共安全与应急', en: 'Safety & emergency response', icon: '⬡', color: '#bf735e', rows: [
        ['安保巡逻场所|门禁与巡检|检查门锁;安检物品', 'Security patrol site|Access control and inspection|Inspect door locks;Screen items', 'AM;M'],
        ['消防救援现场|消防装备部署|连接水带;搬运器材', 'Fire and rescue site|Firefighting equipment deployment|Connect hoses;Carry equipment', 'DBP;H'],
        ['自然灾害现场|清障与救灾|搬移障碍;堆放防汛沙袋', 'Natural disaster site|Debris clearance and relief|Move obstructions;Stack flood sandbags', 'H;HD'],
        ['院前急救现场|救助与转运|展开担架;搬运急救包', 'Emergency medical scene|First aid and transport|Unfold a stretcher;Carry a first aid kit', 'AB;H'],
        ['国防与保障设施|非战斗后勤|搭建营地;装卸物资', 'Defense support facilities|Non-combat logistics|Set up a camp;Load or unload supplies', 'DB;H']
      ]
    },
    {
      id: '18', name: '文化艺术与体育', en: 'Arts, culture & sports', icon: '✦', color: '#a276c0', rows: [
        ['艺术与工艺工作室|艺术创作|雕刻;绘画;陶艺塑形', 'Art and craft studio|Artmaking|Carve material;Paint;Shape clay', 'TP;TP;DB'],
        ['剧院与舞台|舞美布置|安装幕布;摆放道具', 'Theater and stage|Stage setup|Install curtains;Place props', 'DB;H'],
        ['影视摄影现场|摄制准备|安装三脚架;调整灯具', 'Film and photography set|Production setup|Set up a tripod;Adjust lighting', 'AB;AM'],
        ['体育场馆|训练与赛事服务|摆放器材;整理球具', 'Sports venue|Training and event support|Set out equipment;Organize balls and gear', 'H;H'],
        ['博物馆与展馆|展品布置|装配展架;安置展品', 'Museum and exhibition hall|Exhibit setup|Assemble display stands;Place exhibits', 'TB;HP'],
        ['宗教与文化活动场所|仪式与活动准备|摆放器物;布置场地', 'Religious and cultural venue|Ceremony and event preparation|Place objects;Set up the venue', 'H;H']
      ]
    },
    {
      id: '19', name: '个人与特殊服务', en: 'Personal services', icon: '✳', color: '#ae87a3', rows: [
        ['美容美发场所|仪容护理|剪发;梳理;涂抹护肤品', 'Hair and beauty salon|Grooming|Cut hair;Comb hair;Apply skin care products', 'TPI;TI;I'],
        ['洗衣与织补店|衣物护理|熨烫;缝补;折叠', 'Laundry and alterations shop|Garment care|Iron clothes;Mend garments;Fold garments', 'DT;DTP;DB'],
        ['宠物服务场所|动物护理|梳毛;清洁;佩戴护具', 'Pet service facility|Animal care|Brush fur;Clean an animal;Fit protective gear', 'TI;TI;DI'],
        ['汽车洗护维修店|车辆维护|清洁车身;更换滤芯', 'Car wash and repair shop|Vehicle maintenance|Clean a vehicle exterior;Replace a filter', 'T;P'],
        ['殡葬服务场所|场地与物品准备|布置花篮;整理仪式用品', 'Funeral service venue|Venue and material preparation|Arrange floral baskets;Organize ceremony supplies', 'HP;H']
      ]
    },
    {
      id: '20', name: '特殊环境与前沿作业', en: 'Extreme & frontier environments', icon: '◇', color: '#7a94ae', rows: [
        ['极地科考站|野外科研保障|采集环境样本;封装环境样本', 'Polar research station|Field research support|Collect environmental samples;Seal environmental samples', 'HT;A'],
        ['水下作业设施|水下检查维护|操作水下工具;检查连接件', 'Underwater work facility|Underwater inspection and maintenance|Operate underwater tools;Inspect connectors', 'T;M'],
        ['航天在轨环境|装备维护|固定工具;安装设备模块', 'Orbital work environment|Equipment maintenance|Secure tools;Install equipment modules', 'H;P'],
        ['洁净室与隔离设施|特殊环境操作|操作传递窗;封装样品', 'Cleanroom and isolation facility|Controlled-environment operation|Operate a pass-through hatch;Seal samples', 'A;A'],
        ['高危工业环境|隔离操作|远距离搬运物品;远距离收纳物品', 'High-risk industrial environment|Isolated operation|Move objects remotely;Stow objects remotely', 'MH;MH']
      ]
    }
  ];

  function seedTaxonomy() {
    return raw.map(d => ({
      id: `D${d.id}`,
      type: 'domain',
      label: d.name,
      en: d.en,
      icon: d.icon,
      color: d.color,
      skills: [],
      children: d.rows.map(([zh, en, skills], sceneIndex) => {
        const [scene, workflow, taskList] = zh.split('|');
        const [sceneEn, workflowEn, taskListEn] = en.split('|');
        const taskNamesEn = taskListEn.split(';');
        const taskSkills = skills.split(';').map(codes => [...codes].map(code => skillCodes[code]));
        const sid = `D${d.id}-S${String(sceneIndex + 1).padStart(2, '0')}`;
        const wid = `${sid}-W01`;
        return {
          id: sid, type: 'scene', label: scene, en: sceneEn, skills: [],
          children: [{
            id: wid, type: 'workflow', label: workflow, en: workflowEn, skills: [],
            children: taskList.split(';').map((task, taskIndex) => ({
              id: `${wid}-T${String(taskIndex + 1).padStart(2, '0')}`,
              type: 'task', label: task.trim(), en: taskNamesEn[taskIndex],
              skills: taskSkills[taskIndex], skills_initialized: true, children: []
            }))
          }]
        };
      })
    }));
  }

  // Public source pages and bilingual descriptions for the bundled domain photos.
  const DOMAIN_PHOTOS = {
    D01: ['combine-harvester-on-the-field-13233162', 'A combine harvester in a wheat field', '麦田里作业的联合收割机'],
    D02: ['open-pit-mine-with-heavy-excavation-machinery-29506757', 'Heavy machinery in an open-pit mine', '露天矿场里的重型开采设备'],
    D03: ['assembling-machines-in-factory-19233057', 'Machine assembly in a factory', '工厂里的设备装配现场'],
    D04: ['construction-workers-on-the-building-site-10202865', 'Workers at a building site', '建筑工地上的施工人员'],
    D05: ['solar-technician-installing-solar-panel-8853502', 'A technician installing a solar panel', '技术人员安装光伏板'],
    D06: ['airline-ground-crew-managing-luggage-at-airport-33824587', 'Airport ground crew handling luggage', '机场地勤人员处理行李'],
    D07: ['workers-walking-along-aisle-in-warehouse-4487383', 'Workers in a warehouse aisle', '仓库货架通道里的工作人员'],
    D08: ['a-woman-employee-of-a-supermarket-standing-beside-chilled-products-5380920', 'A supermarket employee beside chilled goods', '冷藏货柜旁的超市员工'],
    D09: ['chef-preparing-salad-in-a-restaurant-kitchen-31371693', 'A chef preparing food in a restaurant kitchen', '餐厅后厨里的厨师正在备餐'],
    D10: ['women-making-bed-together-9462628', 'Two people making a guest bed', '两人一起整理客房床铺'],
    D11: ['crop-unrecognizable-woman-cutting-vegetables-in-kitchen-7262907', 'Hands chopping vegetables in a home kitchen', '在家用厨房里切蔬菜的双手', '50% 28%'],
    D12: ['nurse-assisting-patient-in-hospital-corridor-33932453', 'A nurse assisting a patient in a hospital corridor', '护士在医院走廊里协助患者'],
    D13: ['teacher-and-students-in-the-classroom-8617967', 'A teacher and students in a classroom', '教室里的教师和学生'],
    D14: ['people-doing-paperwork-at-a-desk-8152735', 'People handling paperwork at an office desk', '办公桌旁整理文件的人员'],
    D15: ['it-technician-working-in-data-center-server-room-37605911', 'A technician working in a server room', '在数据中心机房工作的技术人员'],
    D16: ['street-cleaner-in-orange-reflective-uniform-sweeping-37322729', 'A sanitation worker sweeping a street', '清扫路面的环卫工人'],
    D17: ['firefighter-holding-hose-with-water-flowing-3013676', 'A firefighter handling a water hose', '操作消防水带的消防员'],
    D18: ['potter-shaping-clay-on-a-spinning-wheel-indoors-34461167', 'A potter shaping clay on a wheel', '工艺师用陶轮塑形'],
    D19: ['a-barber-cutting-a-client-s-hair-7518731', 'A barber cutting a client’s hair', '理发师为顾客剪发'],
    D20: ['underwater-photograph-of-divers-with-equipment-and-rocks-7008962', 'Equipped divers in an underwater environment', '携带装备的潜水员在水下活动']
  };

  window.PHYSICAL_WORK_TAXONOMY = { seedTaxonomy, SKILL_FAMILIES, DOMAIN_PHOTOS, SCHEMA_VERSION: 1 };
})();
