export interface Bean<T = any> {
  name: string;
  value: T;
  init?: Function
}

export class BeanFactory {
  private static instance: BeanFactory;
  beans: Map<string, Bean>;

  private constructor() {
    this.beans = new Map();
  }

  static getInstance(): BeanFactory {
    if (!this.instance) {
      this.instance = new BeanFactory();
    }
    return this.instance;
  }

  /** 注册一个 bean（初始值可选） */
  registry<T>(bean: Bean<T>): void {
    this.beans.set(bean.name, bean);
  }

  /** 获取 bean 的值 */
  getBeanValue<T = any>(name: string): T | undefined {
    return this.beans.get(name)?.value as T | undefined;
  }

  /** 更新 bean 的值 */
  setBeanValue<T>(name: string, value: T): void {
    const bean = this.beans.get(name);
    if (bean) {
      bean.value = value;
    }
  }

  /** 检查 bean 是否已注册 */
  hasBean(name: string): boolean {
    return this.beans.has(name);
  }

  /** 获取所有 bean 名称 */
  getBeanNames(): string[] {
    return Array.from(this.beans.keys());
  }
  async initAllBean() {
    for (const bean of this.beans.values()) {
      if (bean.init) {
        await bean.init()
      }
    }
  }

}
