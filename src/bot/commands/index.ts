/**
 * 命令模块统一入口。
 * 通过 side-effect import 触发各命令文件的 createCommand() 调用，
 * 将命令注册到全局 commands 数组。
 */
import './BG';
import './conclude';
import './concludePerson';
import './describe';
import './haqi2sb';
import './menu';
import './reactions';
import './sharpComment';
