# SpellCompiler Web

法术架构：
首先考虑传统架构：代码->Lexer...-> AST（//给点例子） -> IR(LLVM之类的)（//给点例子） -> CPU执行


我们的架构：Node Graph（用户编辑的图像） -> 一个以json存储的树形IR ->　Unity执行
- 这个IR(Intermediate Representation) 使用类似抽象语法树的结构，但是更接近执行底层，不包括类型和代码信息等
- 这个IR被我命名为Abstract Spell Tree, 抽象法术树，如无特殊指明本项目中AST都指这个抽象法术树, 而非传统意义上的抽象语法树

AST的详情可以在 ast.ts中找到。AST中只有最简单的能支持最基础函数式编程的结构。为了ast的纯粹和简单，加减乘除甚至列表这种基础操作/类型也被作为内置函数执行。详情请参考library.ts。
基本上，可以将一个法术视为用户组合内置函数来建立新的函数，每个法术就是类似一个main函数，无输入无输出（不过现在有输出，当然是处于调试目的）


所有operator都是作为库函数，列表通过函数式实现
循环等也是通过递归实现
有一个全局函数表
有一个特殊的std::this identifier用来引用当前函数

通过Node Graph搭建一个函数式工作流，在flowToIR.ts中转换为AST, 然后丢给游戏引擎执行 - 这就是这个项目的结构







